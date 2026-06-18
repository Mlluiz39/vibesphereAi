import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { withTenant } from '@vibesphere/database';
import { AuditService } from '../audit/audit.service';
import {
  CreateLeadDto,
  CreateOpportunityDto,
  CreatePipelineDto,
  UpdateLeadDto,
} from './dto/crm.dto';

const DEFAULT_STAGES = ['Novo', 'Qualificado', 'Proposta', 'Negociação', 'Fechado', 'Perdido'];

/**
 * CRM — leads, pipelines/estágios e oportunidades — Requisitos 1 e 2.
 * Tudo escopado por tenant via withTenant/RLS.
 */
@Injectable()
export class CrmService {
  constructor(private readonly audit: AuditService) {}

  // ---- Leads ----

  listLeads(tenantId: string, status?: string) {
    return withTenant(tenantId, (tx) =>
      tx.lead.findMany({
        where: status ? { status } : undefined,
        orderBy: { updatedAt: 'desc' },
      }),
    );
  }

  async createLead(tenantId: string, dto: CreateLeadDto) {
    if (dto.contactId) {
      await this.ensure(tenantId, 'contact', dto.contactId);
    }
    return withTenant(tenantId, (tx) => tx.lead.create({ data: { tenantId, ...dto } }));
  }

  async updateLead(tenantId: string, id: string, dto: UpdateLeadDto) {
    await this.ensure(tenantId, 'lead', id);
    return withTenant(tenantId, (tx) => tx.lead.update({ where: { id }, data: dto }));
  }

  /**
   * Captura automática: garante um lead para um contato (idempotente por contato).
   * Chamado pela engine quando um contato novo é criado — Requisito 1.3.
   */
  async ensureLeadForContact(
    tenantId: string,
    contactId: string,
    data: { name?: string; phone?: string; source?: string },
  ) {
    return withTenant(tenantId, async (tx) => {
      const existing = await tx.lead.findFirst({ where: { contactId } });
      if (existing) return existing;
      return tx.lead.create({
        data: {
          tenantId,
          contactId,
          name: data.name ?? data.phone ?? 'Lead',
          phone: data.phone,
          source: data.source ?? 'whatsapp',
          status: 'new',
        },
      });
    });
  }

  // ---- Pipelines / estágios ----

  async createPipeline(tenantId: string, dto: CreatePipelineDto) {
    const stages = dto.stages ?? DEFAULT_STAGES;
    return withTenant(tenantId, (tx) =>
      tx.pipeline.create({
        data: {
          tenantId,
          name: dto.name,
          stages: {
            create: stages.map((name, order) => ({ tenantId, name, order })),
          },
        },
        include: { stages: { orderBy: { order: 'asc' } } },
      }),
    );
  }

  listPipelines(tenantId: string) {
    return withTenant(tenantId, (tx) =>
      tx.pipeline.findMany({
        orderBy: { createdAt: 'asc' },
        include: { stages: { orderBy: { order: 'asc' } } },
      }),
    );
  }

  // ---- Oportunidades ----

  async createOpportunity(tenantId: string, dto: CreateOpportunityDto) {
    await this.ensure(tenantId, 'lead', dto.leadId);
    await this.ensure(tenantId, 'pipeline', dto.pipelineId);
    await this.ensureStageInPipeline(tenantId, dto.pipelineId, dto.stageId);

    return withTenant(tenantId, (tx) =>
      tx.opportunity.create({
        data: {
          tenantId,
          leadId: dto.leadId,
          pipelineId: dto.pipelineId,
          stageId: dto.stageId,
          title: dto.title,
          value: dto.value,
        },
      }),
    );
  }

  listOpportunities(tenantId: string, pipelineId?: string) {
    return withTenant(tenantId, (tx) =>
      tx.opportunity.findMany({
        where: pipelineId ? { pipelineId } : undefined,
        orderBy: { updatedAt: 'desc' },
        include: { lead: { select: { id: true, name: true } }, stage: true },
      }),
    );
  }

  /** Move a oportunidade de estágio e registra o histórico — Requisito 2.3. */
  async moveStage(tenantId: string, opportunityId: string, stageId: string, actorUserId: string) {
    const opp = await withTenant(tenantId, (tx) =>
      tx.opportunity.findUnique({ where: { id: opportunityId } }),
    );
    if (!opp) {
      throw new NotFoundException('Oportunidade não encontrada');
    }
    await this.ensureStageInPipeline(tenantId, opp.pipelineId, stageId);

    const updated = await withTenant(tenantId, (tx) =>
      tx.opportunity.update({ where: { id: opportunityId }, data: { stageId } }),
    );

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'crm.opportunity_stage_changed',
      resource: 'opportunity',
      metadata: { opportunityId, from: opp.stageId, to: stageId },
    });
    return updated;
  }

  // ---- Helpers ----

  private async ensureStageInPipeline(tenantId: string, pipelineId: string, stageId: string) {
    const stage = await withTenant(tenantId, (tx) =>
      tx.pipelineStage.findFirst({ where: { id: stageId, pipelineId } }),
    );
    if (!stage) {
      throw new BadRequestException('Estágio inválido para este pipeline');
    }
  }

  private async ensure(tenantId: string, entity: 'lead' | 'pipeline' | 'contact', id: string) {
    const found = await withTenant(tenantId, (tx) => {
      if (entity === 'lead') return tx.lead.findUnique({ where: { id } });
      if (entity === 'pipeline') return tx.pipeline.findUnique({ where: { id } });
      return tx.contact.findUnique({ where: { id } });
    });
    if (!found) {
      throw new BadRequestException(`${entity} inválido para este tenant`);
    }
  }
}
