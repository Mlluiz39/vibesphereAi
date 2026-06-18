import Stripe from 'stripe';
import { PlanCode } from '@vibesphere/shared';
import {
  CheckoutInput,
  CheckoutResult,
  NormalizedWebhookEvent,
  PaymentProvider,
} from './provider';

/**
 * Adapter de pagamento via Stripe (assinaturas recorrentes) — Requisito 10.3.
 * Os price IDs por plano vêm do ambiente (STRIPE_PRICE_<PLANO>).
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  private priceForPlan(plan: PlanCode): string {
    const map: Record<PlanCode, string | undefined> = {
      [PlanCode.STARTER]: process.env.STRIPE_PRICE_STARTER,
      [PlanCode.PRO]: process.env.STRIPE_PRICE_PRO,
      [PlanCode.ENTERPRISE]: process.env.STRIPE_PRICE_ENTERPRISE,
    };
    const price = map[plan];
    if (!price) {
      throw new Error(`Price ID do Stripe não configurado para o plano ${plan}`);
    }
    return price;
  }

  async createSubscriptionCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: this.priceForPlan(input.planCode), quantity: 1 }],
      client_reference_id: input.tenantId,
      customer_email: input.customerEmail,
      metadata: { tenantId: input.tenantId, planCode: input.planCode },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    if (!session.url) {
      throw new Error('Stripe não retornou URL de checkout');
    }
    return { url: session.url };
  }

  parseWebhook(rawBody: Buffer | string, signature?: string): NormalizedWebhookEvent {
    if (!signature) {
      throw new Error('Assinatura do webhook ausente');
    }
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    return this.normalize(event);
  }

  private normalize(event: Stripe.Event): NormalizedWebhookEvent {
    const base: NormalizedWebhookEvent = { id: event.id, type: event.type };

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        return {
          ...base,
          tenantId: s.client_reference_id ?? s.metadata?.tenantId ?? undefined,
          planCode: (s.metadata?.planCode as PlanCode) ?? undefined,
          providerSubscriptionId: typeof s.subscription === 'string' ? s.subscription : undefined,
          providerCustomerId: typeof s.customer === 'string' ? s.customer : undefined,
          status: 'active',
        };
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        return {
          ...base,
          providerSubscriptionId: sub.id,
          providerCustomerId: typeof sub.customer === 'string' ? sub.customer : undefined,
          status: event.type.endsWith('deleted') ? 'canceled' : sub.status,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : undefined,
        };
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        return {
          ...base,
          providerSubscriptionId:
            typeof inv.subscription === 'string' ? inv.subscription : undefined,
          status: 'past_due',
        };
      }
      default:
        return base;
    }
  }
}
