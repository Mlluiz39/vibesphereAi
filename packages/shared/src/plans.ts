/**
 * Definição de planos e limites — Requisito 10.1.
 * `Infinity` representa "ilimitado" (Enterprise).
 */
export enum PlanCode {
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface PlanLimits {
  whatsappChannels: number;
  agents: number;
  conversationsPerMonth: number;
}

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  [PlanCode.STARTER]: {
    whatsappChannels: 1,
    agents: 3,
    conversationsPerMonth: 1_000,
  },
  [PlanCode.PRO]: {
    whatsappChannels: 5,
    agents: 20,
    conversationsPerMonth: 20_000,
  },
  [PlanCode.ENTERPRISE]: {
    whatsappChannels: Number.POSITIVE_INFINITY,
    agents: Number.POSITIVE_INFINITY,
    conversationsPerMonth: Number.POSITIVE_INFINITY,
  },
};

export function isWithinLimit(current: number, limit: number): boolean {
  return current < limit;
}
