import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: string | null;
  userId: string | null;
  role: string | null;
  /** Super Admin / operações de plataforma ignoram RLS. */
  bypassRls: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function requireTenantId(): string {
  const ctx = storage.getStore();
  if (!ctx?.tenantId) {
    throw new Error('Tenant context ausente para a operação atual');
  }
  return ctx.tenantId;
}
