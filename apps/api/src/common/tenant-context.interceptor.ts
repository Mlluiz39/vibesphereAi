import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@vibesphere/shared';
import { runWithTenantContext, TenantContext } from './tenant-context';

/**
 * Popula o AsyncLocalStorage com o tenant do usuário autenticado para que as
 * consultas apliquem RLS por tenant — Requisito 3.2.
 * Super Admin recebe bypassRls = true (acesso transversal) — Requisito 2.4.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { sub?: string; tenantId?: string; role?: string } | undefined;

    const ctx: TenantContext = {
      tenantId: user?.tenantId ?? null,
      userId: user?.sub ?? null,
      role: user?.role ?? null,
      bypassRls: user?.role === Role.SUPER_ADMIN,
    };

    // next.handle() é lazy: o handler só roda no subscribe. Por isso fazemos o
    // subscribe DENTRO do escopo do AsyncLocalStorage para preservar o contexto.
    return new Observable((subscriber) => {
      runWithTenantContext(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
