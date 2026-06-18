import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { withTenant } from '@vibesphere/database';
import { AuditService } from '../audit/audit.service';

/**
 * Conformidade LGPD — Requisito 11.5.
 * Suporta anonimização (preserva métricas/histórico sem dados pessoais) e
 * exclusão completa (apaga contato e conversas/mensagens em cascata).
 */
@Injectable()
export class PrivacyService {
  constructor(private readonly audit: AuditService) {}

  /** Anonimiza um contato: remove nome, mascara telefone e limpa metadados. */
  async anonymizeContact(tenantId: string, contactId: string, actorUserId: string) {
    const contact = await this.ensureContact(tenantId, contactId);

    // Telefone substituído por um pseudônimo determinístico (não reversível).
    const pseudo = `anon_${createHash('sha256').update(contact.phone).digest('hex').slice(0, 16)}`;

    const updated = await withTenant(tenantId, (tx) =>
      tx.contact.update({
        where: { id: contactId },
        data: { name: null, phone: pseudo, metadata: undefined },
      }),
    );

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'privacy.anonymize_contact',
      resource: 'contact',
      metadata: { contactId },
    });
    return { id: updated.id, anonymized: true };
  }

  /** Exclui um contato e seus dados (conversas/mensagens via cascade). */
  async deleteContact(tenantId: string, contactId: string, actorUserId: string) {
    await this.ensureContact(tenantId, contactId);
    await withTenant(tenantId, (tx) => tx.contact.delete({ where: { id: contactId } }));
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'privacy.delete_contact',
      resource: 'contact',
      metadata: { contactId },
    });
    return { id: contactId, deleted: true };
  }

  private async ensureContact(tenantId: string, contactId: string) {
    const contact = await withTenant(tenantId, (tx) =>
      tx.contact.findUnique({ where: { id: contactId } }),
    );
    if (!contact) {
      throw new NotFoundException('Contato não encontrado');
    }
    return contact;
  }
}
