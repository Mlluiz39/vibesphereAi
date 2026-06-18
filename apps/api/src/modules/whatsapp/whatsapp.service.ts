import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  WhatsAppProviderKind,
  decryptJson,
  encryptJson,
} from '@vibesphere/shared';
import { withTenant } from '@vibesphere/database';
import { MetaCloudCredentials, WhatsAppProviderFactory } from '@vibesphere/whatsapp';
import { MESSAGES_QUEUE } from '../../queue/queue.module';
import { CreateChannelDto, UpdateChannelDto } from './dto/whatsapp.dto';

/** Dados do canal resolvidos para uso em webhook/engine (com credenciais decifradas). */
export interface ResolvedChannel {
  id: string;
  tenantId: string;
  provider: string;
  credentials: MetaCloudCredentials;
}

const PUBLIC_CHANNEL_FIELDS = {
  id: true,
  provider: true,
  phoneNumber: true,
  defaultAgentId: true,
  status: true,
  createdAt: true,
} as const;

/**
 * Canais de WhatsApp + recepção de webhook — Requisitos 7.1/7.2/7.3.
 * Credenciais são armazenadas criptografadas (AES-256-GCM).
 */
@Injectable()
export class WhatsAppService {
  constructor(@Inject(MESSAGES_QUEUE) private readonly messagesQueue: Queue) {}

  // ---- CRUD de canais (escopado por tenant) ----

  listChannels(tenantId: string) {
    return withTenant(tenantId, (tx) =>
      tx.whatsAppChannel.findMany({ select: PUBLIC_CHANNEL_FIELDS, orderBy: { createdAt: 'desc' } }),
    );
  }

  async createChannel(tenantId: string, dto: CreateChannelDto) {
    if (dto.defaultAgentId) {
      await this.ensureAgent(tenantId, dto.defaultAgentId);
    }

    const credentials: MetaCloudCredentials = {
      phoneNumberId: dto.phoneNumberId,
      accessToken: dto.accessToken,
      appSecret: dto.appSecret,
      verifyToken: dto.verifyToken,
    };

    return withTenant(tenantId, (tx) =>
      tx.whatsAppChannel.create({
        data: {
          tenantId,
          provider: dto.provider ?? WhatsAppProviderKind.META_CLOUD,
          phoneNumber: dto.phoneNumber,
          credentialsEncrypted: encryptJson(credentials),
          defaultAgentId: dto.defaultAgentId,
        },
        select: PUBLIC_CHANNEL_FIELDS,
      }),
    );
  }

  async updateChannel(tenantId: string, id: string, dto: UpdateChannelDto) {
    await this.getChannel(tenantId, id);
    if (dto.defaultAgentId) {
      await this.ensureAgent(tenantId, dto.defaultAgentId);
    }
    return withTenant(tenantId, (tx) =>
      tx.whatsAppChannel.update({
        where: { id },
        data: {
          status: dto.status,
          defaultAgentId: dto.defaultAgentId === undefined ? undefined : dto.defaultAgentId,
        },
        select: PUBLIC_CHANNEL_FIELDS,
      }),
    );
  }

  async getChannel(tenantId: string, id: string) {
    const channel = await withTenant(tenantId, (tx) =>
      tx.whatsAppChannel.findUnique({ where: { id }, select: PUBLIC_CHANNEL_FIELDS }),
    );
    if (!channel) {
      throw new NotFoundException('Canal não encontrado');
    }
    return channel;
  }

  async removeChannel(tenantId: string, id: string) {
    await this.getChannel(tenantId, id);
    await withTenant(tenantId, (tx) => tx.whatsAppChannel.delete({ where: { id } }));
  }

  // ---- Webhook (sem contexto de tenant; resolve o canal por id) ----

  /** Resolve o canal e decifra as credenciais. Usa bypass de RLS (rota pública). */
  async resolveChannel(channelId: string): Promise<ResolvedChannel> {
    const channel = await withTenant(
      null,
      (tx) => tx.whatsAppChannel.findUnique({ where: { id: channelId } }),
      { bypassRls: true },
    );
    if (!channel) {
      throw new NotFoundException('Canal não encontrado');
    }
    return {
      id: channel.id,
      tenantId: channel.tenantId,
      provider: channel.provider,
      credentials: decryptJson<MetaCloudCredentials>(channel.credentialsEncrypted),
    };
  }

  /** Handshake de verificação (GET) do webhook — Meta Cloud. */
  async verifyChallenge(channelId: string, query: Record<string, string>): Promise<string> {
    const channel = await this.resolveChannel(channelId);
    const provider = WhatsAppProviderFactory.create({
      kind: channel.provider,
      credentials: channel.credentials,
    });
    // verifyChallenge existe no MetaCloudProvider; checagem defensiva.
    const challenge =
      'verifyChallenge' in provider
        ? (provider as unknown as { verifyChallenge: (q: unknown) => string | null }).verifyChallenge(
            query,
          )
        : null;
    if (challenge === null) {
      throw new BadRequestException('Verificação de webhook falhou');
    }
    return challenge;
  }

  /**
   * Processa um POST de webhook: valida assinatura, parseia e enfileira as
   * mensagens recebidas para a engine — Requisito 7.2.
   * Retorna rápido (o processamento pesado é assíncrono).
   */
  async handleInbound(
    channelId: string,
    rawBody: Buffer | string,
    signature: string | undefined,
    parsedBody: unknown,
  ): Promise<{ accepted: number }> {
    const channel = await this.resolveChannel(channelId);
    const provider = WhatsAppProviderFactory.create({
      kind: channel.provider,
      credentials: channel.credentials,
    });

    if (!provider.verifySignature(rawBody, signature)) {
      throw new BadRequestException('Assinatura de webhook inválida');
    }

    const messages = provider.parseInbound(parsedBody);
    for (const message of messages) {
      await this.messagesQueue.add(
        'inbound',
        { tenantId: channel.tenantId, channelId: channel.id, message },
        // Idempotência: dedupe por id de mensagem do provider — Req 7.2.
        { jobId: `wa:${message.providerMessageId}` },
      );
    }
    return { accepted: messages.length };
  }

  private async ensureAgent(tenantId: string, agentId: string) {
    const agent = await withTenant(tenantId, (tx) => tx.agent.findUnique({ where: { id: agentId } }));
    if (!agent) {
      throw new BadRequestException('Agente inválido para este tenant');
    }
  }
}
