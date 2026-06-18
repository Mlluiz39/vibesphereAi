import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@vibesphere/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Valida se o perfil do usuário pode acessar a rota — Requisito 2.2/2.3.
 * Super Admin sempre passa (acesso transversal) — Requisito 2.4.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: Role } | undefined;

    if (user?.role === Role.SUPER_ADMIN) {
      return true;
    }

    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException('Permissão insuficiente para esta operação');
    }
    return true;
  }
}
