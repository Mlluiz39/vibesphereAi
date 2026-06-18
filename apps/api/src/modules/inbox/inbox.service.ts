import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationState as SharedState, decryptJson } from '@vibesphere/shared';
import { ConversationState, MessageDirection, withTenant } from '@vibesphere/database';
import { MetaCloudCredentials, WhatsAppProviderFactory } from '@vibesphere/whatsapp';
import { AuditService } from '../audit/audit.service';
import { ListConversationsQuery } from './dto/inbox.dto';

/**
 * Inbox omnichannel — Requisitos 9.1–9.5.
 * Listagem/visualização de conversas, transição IA↔Humano, transferência,
 * anotações, etiquetas e envio de mensagem pelo atendente.
 */
@Injectable()
export class InboxService {
  constructor(private readonly audit: AuditService) {}

  /** Lista conversas do tenant com filtro por estado — Req 9.1. */
  listConversations(tenantId: string, query: ListConversationsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    return withTenant(tenantId, (tx) =>
      tx.conversation.findMany({
        where: query.state ? { state: query.state as ConversationState } : undefined,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, name: true } },
          labels: { include: { label: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    );
  }

  /** Detalhe da conversa com histórico, notas e etiquetas. */
  async getConversation(tenantId: string, id: string) {
    const conversation = await withTenant(tenantId, (tx) =>
      tx.conversation.findUnique({
        where: { id },
        include: {
          contact: true,
          agent: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, name: true } },
          messages: { orderBy: { createdAt: 'asc' } },
          notes: { orderBy: { createdAt: 'desc' } },
          labels: { include: { label: true } },
        },
      }),
    );
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }
    return conversation;
  }

  /** Atendente assume a conversa: estado -> Humano, pausando a IA — Req 9.2. */
  async assign(tenantId: string, id: string, userId: string) {
    await this.ensureConversation(tenantId, id);
    const updated = await withTenant(tenantId, (tx) =>
      tx.conversation.update({
        where: { id },
        data: { state: ConversationState.human, assignedUserId: userId },
      }),
    );
    await this.audit.log({
      tenantId,
      actorUserId: userId,
      action: 'inbox.assign',
      resource: 'conversation',
      metadata: { conversationId: id },
    });
    return updated;
  }

  /** Transfere a conversa para outro atendente, registrando o histórico — Req 9.3. */
  async transfer(tenantId: string, id: string, toUserId: string, actorUserId: string) {
    const conversation = await this.ensureConversation(tenantId, id);

    const target = await withTenant(tenantId, (tx) =>
      tx.user.findUnique({ where: { id: toUserId } }),
    );
    if (!target) {
      throw new BadRequestException('Usuário de destino inválido para este tenant');
    }

    const updated = await withTenant(tenantId, (tx) =>
      tx.conversation.update({
        where: { id },
        data: { assignedUserId: toUserId, state: ConversationState.human },
      }),
    );

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'inbox.transfer',
      resource: 'conversation',
      metadata: { conversationId: id, from: conversation.assignedUserId, to: toUserId },
    });
    return updated;
  }

  /** Altera o estado da conversa (ex.: reativar IA, finalizar). */
  async setState(tenantId: string, id: string, state: SharedState, actorUserId: string) {
    await this.ensureConversation(tenantId, id);
    const updated = await withTenant(tenantId, (tx) =>
      tx.conversation.update({
        where: { id },
        data: { state: state as ConversationState },
      }),
    );
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'inbox.set_state',
      resource: 'conversation',
      metadata: { conversationId: id, state },
    });
    return updated;
  }

  // ---- Anotações ----

  async addNote(tenantId: string, conversationId: string, userId: string, body: string) {
    await this.ensureConversation(tenantId, conversationId);
    return withTenant(tenantId, (tx) =>
      tx.conversationNote.create({
        data: { tenantId, conversationId, userId, body },
      }),
    );
  }

  // ---- Etiquetas ----

  listLabels(tenantId: string) {
    return withTenant(tenantId, (tx) => tx.label.findMany({ orderBy: { name: 'asc' } }));
  }

  createLabel(tenantId: string, name: string, color?: string) {
    return withTenant(tenantId, (tx) => tx.label.create({ data: { tenantId, name, color } }));
  }

  async addLabel(tenantId: string, conversationId: string, labelId: string) {
    await this.ensureConversation(tenantId, conversationId);
    return withTenant(tenantId, (tx) =>
      tx.conversationLabel.upsert({
        where: { conversationId_labelId: { conversationId, labelId } },
        update: {},
        create: { tenantId, conversationId, labelId },
      }),
    );
  }

  async removeLabel(tenantId: string, conversationId: string, labelId: string) {
    await this.ensureConversation(tenantId, conversationId);
    await withTenant(tenantId, (tx) =>
      tx.conversationLabel.deleteMany({ where: { conversationId, labelId } }),
    );
  }

  // ---- Envio pelo atendente — Req 9.5 ----

  async sendMessage(tenantId: string, conversationId: string, text: string, userId: string) {
    const conversation = await withTenant(tenantId, (tx) =>
      tx.conversation.findUnique({
        where: { id: conversationId },
        include: { channel: true, contact: true },
      }),
    );
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    // Persiste como saída (mensagem do atendente).
    const message = await withTenant(tenantId, (tx) =>
      tx.message.create({
        data: {
          tenantId,
          conversationId,
          direction: MessageDirection.outbound,
          content: text,
        },
      }),
    );

    // Entrega via provider de WhatsApp do canal.
    try {
      const credentials = decryptJson<MetaCloudCredentials>(conversation.channel.credentialsEncrypted);
      const provider = WhatsAppProviderFactory.create({
        kind: conversation.channel.provider,
        credentials,
      });
      await provider.sendText({ to: conversation.contact.phone, text });
    } catch (err) {
      throw new BadGatewayException(`Falha ao enviar mensagem: ${(err as Error).message}`);
    }

    await this.audit.log({
      tenantId,
      actorUserId: userId,
      action: 'inbox.send_message',
      resource: 'conversation',
      metadata: { conversationId },
    });
    return message;
  }

  private async ensureConversation(tenantId: string, id: string) {
    const conversation = await withTenant(tenantId, (tx) =>
      tx.conversation.findUnique({ where: { id } }),
    );
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }
    return conversation;
  }
}
