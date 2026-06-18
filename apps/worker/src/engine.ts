import { PLAN_LIMITS, PlanCode, decryptJson } from '@vibesphere/shared';
import { ConversationState, MessageDirection, Prisma, withTenant } from '@vibesphere/database';
import { ChatMessage } from '@vibesphere/llm';
import { buildContextBlock, retrieveRelevantChunks } from '@vibesphere/rag';
import {
  InboundMessage,
  MetaCloudCredentials,
  WhatsAppProvider,
  WhatsAppProviderFactory,
} from '@vibesphere/whatsapp';
import { embeddingModel, getChatProvider, getEmbeddingProvider } from './providers';

export interface InboundJobData {
  tenantId: string;
  channelId: string;
  message: InboundMessage;
}

const MEMORY_WINDOW = 10;
const SEND_MAX_ATTEMPTS = 3;

/**
 * Orquestra uma mensagem recebida do WhatsApp — Requisitos 8.1/8.2/8.3/8.5.
 * Resolve contato/conversa, persiste a entrada e, se a conversa estiver no
 * estado "IA", gera e envia a resposta do agente (com memória + RAG).
 */
export async function processInboundMessage(data: InboundJobData): Promise<void> {
  const { tenantId, channelId, message } = data;

  // 1. Resolve canal (com agente padrão) e idempotência da mensagem.
  const setup = await withTenant(tenantId, async (tx) => {
    const channel = await tx.whatsAppChannel.findUnique({ where: { id: channelId } });
    if (!channel) {
      throw new Error(`Canal ${channelId} não encontrado`);
    }

    // Idempotência: se a mensagem já foi registrada, ignora — Req 7.2.
    if (message.providerMessageId) {
      const existing = await tx.message.findUnique({
        where: { providerMessageId: message.providerMessageId },
      });
      if (existing) {
        return null;
      }
    }

    // Upsert do contato pelo telefone.
    const contact = await tx.contact.upsert({
      where: { tenantId_phone: { tenantId, phone: message.from } },
      update: message.contactName ? { name: message.contactName } : {},
      create: { tenantId, phone: message.from, name: message.contactName },
    });

    // Conversa ativa existente (não finalizada) para contato + canal.
    let conversation = await tx.conversation.findFirst({
      where: { contactId: contact.id, channelId, state: { not: ConversationState.closed } },
      orderBy: { createdAt: 'desc' },
    });

    let isNew = false;
    if (!conversation) {
      // Bloqueio por limite de conversas do plano — Req 8.4/10.5.
      const canCreate = await withinConversationQuota(tx, tenantId);
      if (!canCreate) {
        return { blocked: true } as const;
      }
      conversation = await tx.conversation.create({
        data: {
          tenantId,
          contactId: contact.id,
          channelId,
          agentId: channel.defaultAgentId,
          state: ConversationState.ai,
        },
      });
      isNew = true;
    }

    // Persiste a mensagem de entrada.
    await tx.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        direction: MessageDirection.inbound,
        content: message.text,
        providerMessageId: message.providerMessageId,
      },
    });

    return { conversation, channel, isNew, blocked: false };
  });

  // Mensagem duplicada ou conversa bloqueada por limite: nada a responder.
  if (!setup || setup.blocked) {
    return;
  }

  const { conversation, channel } = setup;

  // 2. Só responde automaticamente quando a conversa está no estado "IA" — Req 8.2 / 9.2.
  if (conversation.state !== ConversationState.ai || !conversation.agentId) {
    return;
  }

  // 3. Carrega agente + memória recente.
  const { agent, history } = await withTenant(tenantId, async (tx) => {
    const ag = await tx.agent.findUnique({ where: { id: conversation.agentId! } });
    const msgs = await tx.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: MEMORY_WINDOW,
    });
    return { agent: ag, history: msgs.reverse() };
  });

  if (!agent) {
    return;
  }

  // 4. RAG: recupera contexto da base de conhecimento associada — Req 6.4 / 8.5.
  let contextBlock = '';
  if (agent.knowledgeBaseId) {
    try {
      const chunks = await retrieveRelevantChunks({
        tenantId,
        knowledgeBaseId: agent.knowledgeBaseId,
        query: message.text,
        provider: getEmbeddingProvider(),
        embeddingModel: embeddingModel(),
        limit: 5,
      });
      contextBlock = buildContextBlock(chunks);
    } catch (err) {
      console.error('[engine] falha no RAG, seguindo sem contexto:', (err as Error).message);
    }
  }

  // 5. Monta o prompt e gera a resposta.
  const systemContent = contextBlock
    ? `${agent.systemPrompt}\n\nUse o contexto abaixo quando for relevante:\n${contextBlock}`
    : agent.systemPrompt;

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...history.map((m): ChatMessage => ({
      role: m.direction === MessageDirection.inbound ? 'user' : 'assistant',
      content: m.content,
    })),
  ];

  const provider = getChatProvider(agent.provider);
  const result = await provider.chat({
    model: agent.model,
    messages: chatMessages,
    temperature: agent.temperature,
  });
  const reply = result.content.trim();
  if (!reply) {
    return;
  }

  // 6. Persiste a resposta e envia pelo WhatsApp.
  await withTenant(tenantId, (tx) =>
    tx.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        direction: MessageDirection.outbound,
        content: reply,
      },
    }),
  );

  const credentials = decryptJson<MetaCloudCredentials>(channel.credentialsEncrypted);
  const waProvider = WhatsAppProviderFactory.create({ kind: channel.provider, credentials });
  await sendWithRetry(waProvider, message.from, reply);
}

/** Conta conversas do mês corrente e compara ao limite do plano. */
async function withinConversationQuota(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<boolean> {
  const subscription = await tx.subscription.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  const code = subscription ? (String(subscription.plan.code) as PlanCode) : PlanCode.STARTER;
  const limit = (PLAN_LIMITS[code] ?? PLAN_LIMITS[PlanCode.STARTER]).conversationsPerMonth;
  if (!Number.isFinite(limit)) {
    return true;
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const count = await tx.conversation.count({ where: { createdAt: { gte: startOfMonth } } });
  return count < limit;
}

/** Envio com retentativa e backoff (Req 7.5), sem reprocessar a geração da resposta. */
async function sendWithRetry(
  provider: WhatsAppProvider,
  to: string,
  text: string,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= SEND_MAX_ATTEMPTS; attempt++) {
    try {
      await provider.sendText({ to, text });
      return;
    } catch (err) {
      lastError = err;
      if (attempt < SEND_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  // Falha de entrega não reprocessa a geração; apenas registra — Req 7.5.
  console.error(`[engine] falha ao enviar resposta para ${to}:`, (lastError as Error)?.message);
}
