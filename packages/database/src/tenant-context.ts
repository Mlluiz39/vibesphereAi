import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './client';

/**
 * Executa um callback dentro de uma transação com `app.current_tenant` setado,
 * garantindo que as políticas de RLS filtrem por tenant — Requisito 3.2/3.3.
 *
 * Para operações de plataforma (Super Admin / jobs), use `bypassRls = true`.
 */
export async function withTenant<T>(
  tenantId: string | null,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { bypassRls?: boolean } = {},
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (options.bypassRls) {
      await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);
    } else {
      if (!tenantId) {
        throw new Error('withTenant requer tenantId quando bypassRls não está ativo');
      }
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant', $1, true)`, tenantId);
    }
    return fn(tx);
  });
}

export type { PrismaClient };
