import { SetMetadata } from '@nestjs/common';
import type { LimitedResource } from '../plan-limit.service';

export const PLAN_LIMIT_KEY = 'planLimitResource';

/**
 * Marca uma rota de criação para que o PlanLimitGuard valide o limite do plano
 * antes de permitir a operação — Requisito 5.2.
 */
export const EnforcePlanLimit = (resource: LimitedResource) =>
  SetMetadata(PLAN_LIMIT_KEY, resource);
