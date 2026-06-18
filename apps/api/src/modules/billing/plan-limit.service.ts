import { ForbiddenException, Injectable } from '@nestjs/common';
import { PLAN_LIMITS, PlanCode, PlanLimits } from '@vibesphere/shared';
import { withTenant } from '@vibesphere/database';

/** Recursos do plano que possuem limite de quantidade. */
export type LimitedResource = keyof PlanLimits; // 'whatsappChannels' | 'agents' | 'conversationsPerMonth'

/**
 * Valor de "ilimitado" como persistido no banco (o seed converte Infinity em -1,
 * pois JSON não serializa Infinity) — ver packages/database/prisma/seed.ts.
 */
const UNLIMITED_DB_VALUE = -1;

/**
 * Resolve limites de plano e uso atual por tenant — base dos Requisitos 5.2/5.3 e 10.5.
 */
@Injectable()
export class PlanLimitService {
  /**
   * Retorna os limites do plano ativo do tenant.
   * `Infinity` representa "ilimitado". Faz fallback para Starter se não houver assinatura.
   */
  async getLimits(tenantId: string): Promise<PlanLimits> {
    const subscription = await withTenant(tenantId, (tx) =>
      tx.subscription.findFirst({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
    );

    if (!subscription) {
      return PLAN_LIMITS[PlanCode.STARTER];
    }

    const raw = (subscription.plan.limits ?? {}) as Record<string, number>;
    return {
      whatsappChannels: normalize(raw.whatsappChannels),
      agents: normalize(raw.agents),
      conversationsPerMonth: normalize(raw.conversationsPerMonth),
    };
  }

  /** Conta o uso atual de um recurso para o tenant. */
  async getUsage(tenantId: string, resource: LimitedResource): Promise<number> {
    return withTenant(tenantId, (tx) => {
      switch (resource) {
        case 'agents':
          return tx.agent.count();
        case 'whatsappChannels':
          return tx.whatsAppChannel.count();
        case 'conversationsPerMonth':
          return tx.conversation.count();
        default:
          return Promise.resolve(0);
      }
    });
  }

  /**
   * Garante que ainda há margem para criar mais um recurso.
   * Lança 403 com mensagem de upgrade quando o limite é atingido — Req 5.3 / 10.5.
   */
  async assertCanCreate(tenantId: string, resource: LimitedResource): Promise<void> {
    const limits = await this.getLimits(tenantId);
    const limit = limits[resource];

    if (!Number.isFinite(limit)) {
      return; // ilimitado
    }

    const current = await this.getUsage(tenantId, resource);
    if (current >= limit) {
      throw new ForbiddenException({
        message: `Limite do plano atingido para "${resource}" (${limit}). Faça upgrade para continuar.`,
        details: { resource, limit, current, upgradeRequired: true },
      });
    }
  }
}

function normalize(value: number | undefined): number {
  if (value === undefined || value === null) {
    return 0;
  }
  return value === UNLIMITED_DB_VALUE ? Number.POSITIVE_INFINITY : value;
}
