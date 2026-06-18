import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LLMProviderKind } from '@vibesphere/shared';
import { withTenant } from '@vibesphere/database';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

const DEFAULTS = {
  temperature: 0.7,
  provider: LLMProviderKind.OPENAI,
  model: 'gpt-4o-mini',
};

/**
 * Gestão de agentes escopada ao tenant — Requisitos 5.1 / 5.6.
 * Todas as operações passam por withTenant (RLS), impedindo acesso cross-tenant.
 */
@Injectable()
export class AgentService {
  list(tenantId: string) {
    return withTenant(tenantId, (tx) => tx.agent.findMany({ orderBy: { createdAt: 'desc' } }));
  }

  async get(tenantId: string, id: string) {
    const agent = await withTenant(tenantId, (tx) => tx.agent.findUnique({ where: { id } }));
    if (!agent) {
      throw new NotFoundException('Agente não encontrado');
    }
    return agent;
  }

  async create(tenantId: string, dto: CreateAgentDto) {
    if (dto.knowledgeBaseId) {
      await this.ensureKnowledgeBase(tenantId, dto.knowledgeBaseId);
    }

    return withTenant(tenantId, (tx) =>
      tx.agent.create({
        data: {
          tenantId,
          name: dto.name,
          goal: dto.goal,
          personality: dto.personality,
          temperature: dto.temperature ?? DEFAULTS.temperature,
          systemPrompt: dto.systemPrompt,
          provider: dto.provider ?? DEFAULTS.provider,
          model: dto.model ?? DEFAULTS.model,
          knowledgeBaseId: dto.knowledgeBaseId,
        },
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateAgentDto) {
    await this.get(tenantId, id);

    if (dto.knowledgeBaseId) {
      await this.ensureKnowledgeBase(tenantId, dto.knowledgeBaseId);
    }

    return withTenant(tenantId, (tx) =>
      tx.agent.update({
        where: { id },
        data: {
          name: dto.name,
          goal: dto.goal,
          personality: dto.personality,
          temperature: dto.temperature,
          systemPrompt: dto.systemPrompt,
          provider: dto.provider,
          model: dto.model,
          // null desassocia a base de conhecimento; undefined mantém o valor atual.
          knowledgeBaseId: dto.knowledgeBaseId === undefined ? undefined : dto.knowledgeBaseId,
        },
      }),
    );
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await withTenant(tenantId, (tx) => tx.agent.delete({ where: { id } }));
  }

  /** Valida que a base de conhecimento pertence ao tenant atual — Requisito 5.6 / 3.2. */
  private async ensureKnowledgeBase(tenantId: string, knowledgeBaseId: string) {
    const kb = await withTenant(tenantId, (tx) =>
      tx.knowledgeBase.findUnique({ where: { id: knowledgeBaseId } }),
    );
    if (!kb) {
      throw new BadRequestException('Base de conhecimento inválida para este tenant');
    }
  }
}
