import { Global, Module } from '@nestjs/common';
import { PlanLimitService } from './plan-limit.service';
import { PlanLimitGuard } from './plan-limit.guard';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PAYMENT_PROVIDER, createPaymentProvider } from './payment/payment.factory';

/**
 * Módulo de billing — Tarefa 11.
 * @Global: PlanLimitGuard/PlanLimitService ficam disponíveis para os guards de
 * outros módulos (agent, whatsapp) sem necessidade de re-importar.
 */
@Global()
@Module({
  controllers: [BillingController],
  providers: [
    PlanLimitService,
    PlanLimitGuard,
    BillingService,
    { provide: PAYMENT_PROVIDER, useFactory: createPaymentProvider },
  ],
  exports: [PlanLimitService, PlanLimitGuard, BillingService],
})
export class BillingModule {}
