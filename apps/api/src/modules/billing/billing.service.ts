import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { PlanCode } from '@vibesphere/shared';
import { prisma, withTenant } from '@vibesphere/database';
import { AuditService } from '../audit/audit.service';
import { PlanLimitService } from './plan-limit.service';
import { PAYMENT_PROVIDER } from './payment/payment.factory';
import { NormalizedWebhookEvent, PaymentProvider } from './payment/provider';

@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');

  constructor(
    private readonly planLimits: PlanLimitService,
    private readonly audit: AuditService,
    @Optional() @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider | null,
  ) {}

  /** Resumo de assinatura, limites e uso + sinalização de upgrade — Req 10.2/10.5/11.4. */
  async getSummary(tenantId: string) {
    const [subscription, limits] = await Promise.all([
      withTenant(tenantId, (tx) =>
        tx.subscription.findFirst({
          where: { status: { not: 'canceled' } },
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        }),
      ),
      this.planLimits.getLimits(tenantId),
    ]);

    const [agents, whatsappChannels, conversationsThisMonth] = await Promise.all([
      this.planLimits.getUsage(tenantId, 'agents'),
      this.planLimits.getUsage(tenantId, 'whatsappChannels'),
      this.conversationsThisMonth(tenantId),
    ]);

    const over = (used: number, limit: number) => Number.isFinite(limit) && used >= limit;

    return {
      plan: subscription ? { code: subscription.plan.code, name: subscription.plan.name } : null,
      status: subscription?.status ?? 'none',
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      // Infinity é serializado como null no JSON (= ilimitado).
      limits,
      usage: { agents, whatsappChannels, conversationsThisMonth },
      upgradeRequired: {
        agents: over(agents, limits.agents),
        whatsappChannels: over(whatsappChannels, limits.whatsappChannels),
        conversations: over(conversationsThisMonth, limits.conversationsPerMonth),
      },
    };
  }

  /** Cria uma sessão de checkout de assinatura — Req 10.3. */
  async createCheckout(tenantId: string, planCode: PlanCode, customerEmail?: string) {
    if (!this.payment) {
      throw new BadRequestException('Provedor de pagamento não configurado');
    }
    const successUrl = process.env.BILLING_SUCCESS_URL ?? 'http://localhost:3000/billing/success';
    const cancelUrl = process.env.BILLING_CANCEL_URL ?? 'http://localhost:3000/billing/cancel';

    const result = await this.payment.createSubscriptionCheckout({
      tenantId,
      planCode,
      customerEmail,
      successUrl,
      cancelUrl,
    });

    await this.audit.log({
      tenantId,
      action: 'billing.checkout_created',
      resource: 'subscription',
      metadata: { planCode },
    });
    return result;
  }

  /** Processa webhook de pagamento de forma idempotente — Req 10.4. */
  async handleWebhook(rawBody: Buffer | string, signature?: string) {
    if (!this.payment) {
      throw new BadRequestException('Provedor de pagamento não configurado');
    }

    let event: NormalizedWebhookEvent;
    try {
      event = this.payment.parseWebhook(rawBody, signature);
    } catch (err) {
      throw new BadRequestException(`Webhook inválido: ${(err as Error).message}`);
    }

    // Idempotência: registra o evento; se já processado, ignora.
    try {
      await prisma.processedWebhookEvent.create({
        data: { provider: this.payment.name, eventId: event.id },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return { duplicated: true };
      }
      throw err;
    }

    await this.applyEvent(event);
    return { processed: true };
  }

  private async applyEvent(event: NormalizedWebhookEvent) {
    // checkout concluído: vincula/ativa a assinatura do tenant.
    if (event.tenantId && event.planCode) {
      const plan = await prisma.plan.findUnique({ where: { code: event.planCode as PlanCode } });
      if (!plan) {
        this.logger.error(`Plano ${event.planCode} não encontrado no webhook ${event.id}`);
        return;
      }

      const existing = await prisma.subscription.findFirst({
        where: { tenantId: event.tenantId },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            status: event.status ?? 'active',
            stripeSubscriptionId: event.providerSubscriptionId,
            stripeCustomerId: event.providerCustomerId,
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            tenantId: event.tenantId,
            planId: plan.id,
            status: event.status ?? 'active',
            stripeSubscriptionId: event.providerSubscriptionId,
            stripeCustomerId: event.providerCustomerId,
          },
        });
      }

      await this.audit.log({
        tenantId: event.tenantId,
        action: 'billing.subscription_activated',
        resource: 'subscription',
        metadata: { planCode: event.planCode },
      });
      return;
    }

    // Demais eventos: mapeia pela assinatura do provider.
    if (event.providerSubscriptionId) {
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: event.providerSubscriptionId },
      });
      if (!subscription) {
        this.logger.warn(`Assinatura ${event.providerSubscriptionId} não encontrada (evento ${event.id})`);
        return;
      }
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: event.status ?? subscription.status,
          currentPeriodEnd: event.currentPeriodEnd ?? subscription.currentPeriodEnd,
        },
      });
      await this.audit.log({
        tenantId: subscription.tenantId,
        action: 'billing.subscription_updated',
        resource: 'subscription',
        metadata: { status: event.status },
      });
    }
  }

  private conversationsThisMonth(tenantId: string): Promise<number> {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    return withTenant(tenantId, (tx) =>
      tx.conversation.count({ where: { createdAt: { gte: start } } }),
    );
  }
}
