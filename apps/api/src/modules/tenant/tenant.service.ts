import { Injectable, NotFoundException } from '@nestjs/common';
import { withTenant } from '@vibesphere/database';

@Injectable()
export class TenantService {
  /** Retorna dados do tenant atual (escopado por RLS). */
  async getCurrent(tenantId: string) {
    const tenant = await withTenant(tenantId, (tx) =>
      tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, subdomain: true, branding: true, status: true },
      }),
    );
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }
    return tenant;
  }

  /** Atualiza branding básico — Requisito 4.4. */
  async updateBranding(tenantId: string, branding: Record<string, unknown>) {
    return withTenant(tenantId, (tx) =>
      tx.tenant.update({ where: { id: tenantId }, data: { branding } }),
    );
  }
}
