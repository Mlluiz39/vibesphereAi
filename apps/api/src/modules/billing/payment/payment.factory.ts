import { Logger } from '@nestjs/common';
import { PaymentProvider } from './provider';
import { StripeProvider } from './stripe.provider';

const logger = new Logger('PaymentProvider');

/**
 * Resolve o provedor de pagamento ativo a partir do ambiente.
 * MVP: Stripe. Extensível para Mercado Pago / PIX.
 * Retorna `null` quando não há provedor configurado (billing opcional em dev).
 */
export function createPaymentProvider(): PaymentProvider | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (secret && webhookSecret) {
    return new StripeProvider(secret, webhookSecret);
  }

  logger.warn('Nenhum provedor de pagamento configurado (STRIPE_SECRET_KEY/WEBHOOK_SECRET ausentes).');
  return null;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
