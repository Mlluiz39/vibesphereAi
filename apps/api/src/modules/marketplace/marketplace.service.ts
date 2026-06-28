import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, withTenant } from '@vibesphere/database';
import { PlanLimitService } from '../billing/plan-limit.service';
import { AuditService } from '../audit/audit.service';
import { MarketplaceTemplate, TEMPLATES, findTemplate } from './templates.catalog';

export interface InstallResult {
  templateId: string;
  agentId?: string;
  knowledgeBaseId?: string;
  flowId?: string;
}

/**
 * Marketplace — catálogo e instalação de templates — Requisito 5.
 * A instalação cria os recursos no tenant respeitando os limites do plano.
 */
@Injectable()
export class MarketplaceService {
  constructor(
    private readonly planLimits: PlanLimitService,
    private readonly audit: AuditService,
  ) {}

  listTemplates(category?: string): MarketplaceTemplate[] {
    return category ? TEMPLATES.filter((t) => t.category === category) : TEMPLATES;
  }

  /** Instala um template criando os recursos correspondentes — Requisito 5.2/5.3. */
  async install(tenantId: string, templateId: string, actorUserId: string): Promise<InstallResult> {
    const template = findTemplate(templateId);
    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    // Bloqueia se exceder o limite de agentes do plano — Requisito 5.3.
    if (template.agent) {
      await this.planLimits.assertCanCreate(tenantId, 'agents');
    }

    const result = await withTenant(tenantId, async (tx) => {
      const out: InstallResult = { templateId };

      // Base de conhecimento (opcional).
      let knowledgeBaseId: string | undefined;
      if (template.knowledgeBaseName) {
        const kb = await tx.knowledgeBase.create({
          data: { tenantId, name: template.knowledgeBaseName },
        });
        knowledgeBaseId = kb.id;
        out.knowledgeBaseId = kb.id;
      }

      // Agente (opcional), já associado à base criada.
      if (template.agent) {
        const agent = await tx.agent.create({
          data: {
            tenantId,
            name: template.agent.name,
            goal: template.agent.goal,
            personality: template.agent.personality,
            systemPrompt: template.agent.systemPrompt,
            model: template.agent.model ?? 'gpt-4o-mini',
            knowledgeBaseId,
          },
        });
        out.agentId = agent.id;
      }

      // Flow (opcional).
      if (template.flow) {
        const flow = await tx.flow.create({
          data: { tenantId, name: template.flow.name },
        });
        const keyToId = new Map<string, string>();
        for (const node of template.flow.nodes) {
          const created = await tx.flowNode.create({
            data: {
              tenantId,
              flowId: flow.id,
              type: node.type,
              config: (node.config ?? {}) as Prisma.InputJsonValue,
            },
          });
          keyToId.set(node.key, created.id);
        }
        for (const edge of template.flow.edges) {
          await tx.flowEdge.create({
            data: {
              tenantId,
              flowId: flow.id,
              fromNodeId: keyToId.get(edge.from)!,
              toNodeId: keyToId.get(edge.to)!,
              label: edge.label,
            },
          });
        }
        out.flowId = flow.id;
      }

      return out;
    });

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'marketplace.install',
      resource: 'template',
      metadata: { ...result, templateId },
    });
    return result;
  }
}
