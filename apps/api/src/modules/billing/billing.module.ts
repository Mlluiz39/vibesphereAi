import { Module } from '@nestjs/common';
import { PlanLimitService } from './plan-limit.service';
import { PlanLimitGuard } from './plan-limit.guard';

/**
 * Módulo de billing (Fase 1 — parcial).
 * Por ora expõe a lógica de limites de plano usada pelos demais módulos.
 * Subscriptions/Stripe/usage chegam na Tarefa 11.
 */
@Module({
  providers: [PlanLimitService, PlanLimitGuard],
  exports: [PlanLimitService, PlanLimitGuard],
})
export class BillingModule {}
