import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@vibesphere/shared';
import { LimitedResource, PlanLimitService } from './plan-limit.service';
import { PLAN_LIMIT_KEY } from './decorators/plan-limit.decorator';

/**
 * Bloqueia a criação de recursos quando o limite do plano do tenant foi atingido.
 * Requisitos 5.2/5.3 (agentes) — reutilizável para canais de WhatsApp e conversas.
 */
@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimits: PlanLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<LimitedResource | undefined>(PLAN_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resource) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { tenantId?: string; role?: Role } | undefined;

    // Super Admin (operações de plataforma) não está sujeito a limites de tenant.
    if (user?.role === Role.SUPER_ADMIN || !user?.tenantId) {
      return true;
    }

    await this.planLimits.assertCanCreate(user.tenantId, resource);
    return true;
  }
}
