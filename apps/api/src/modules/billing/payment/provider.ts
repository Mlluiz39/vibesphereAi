import { PlanCode } from '@vibesphere/shared';

/**
 * Abstração de provedor de pagamento — Requisito 10.3.
 * Permite suportar Stripe, Mercado Pago e PIX sem alterar a lógica de billing.
 */

export interface CheckoutInput {
  tenantId: string;
  planCode: PlanCode;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  url: string;
}

/** Evento de webhook normalizado, independente do provedor. */
export interface NormalizedWebhookEvent {
  /** ID único do evento (idempotência). */
  id: string;
  type: string;
  tenantId?: string;
  planCode?: PlanCode;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  /** Status mapeado para o domínio (active, past_due, canceled, ...). */
  status?: string;
  currentPeriodEnd?: Date;
}

export interface PaymentProvider {
  readonly name: string;
  createSubscriptionCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Valida a assinatura e normaliza o evento de webhook. */
  parseWebhook(rawBody: Buffer | string, signature?: string): NormalizedWebhookEvent;
}
