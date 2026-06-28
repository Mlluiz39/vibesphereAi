import { Injectable, Logger } from '@nestjs/common';
import { Prisma, prisma } from '@vibesphere/database';

export interface AuditEntry {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registro de operações sensíveis — Requisito 11.1.
 * Falhas de auditoria nunca devem quebrar a operação principal (best-effort log).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId ?? null,
          actorUserId: entry.actorUserId ?? null,
          action: entry.action,
          resource: entry.resource,
          metadata: entry.metadata as Prisma.InputJsonValue ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Falha ao gravar audit log (${entry.action})`, err as Error);
    }
  }
}
