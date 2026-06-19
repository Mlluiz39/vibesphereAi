import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Prisma, withTenant } from '@vibesphere/database';
import { FLOW_QUEUE } from '../../queue/queue.module';
import { RunFlowDto, UpsertFlowDto } from './dto/flow.dto';

/**
 * Flow Builder — CRUD de flows (nós/edges) + disparo de execução — Requisito 4.
 */
@Injectable()
export class FlowService {
  constructor(@Inject(FLOW_QUEUE) private readonly flowQueue: Queue) {}

  listFlows(tenantId: string) {
    return withTenant(tenantId, (tx) =>
      tx.flow.findMany({ orderBy: { updatedAt: 'desc' }, include: { _count: { select: { nodes: true } } } }),
    );
  }

  async getFlow(tenantId: string, id: string) {
    const flow = await withTenant(tenantId, (tx) =>
      tx.flow.findUnique({ where: { id }, include: { nodes: true, edges: true } }),
    );
    if (!flow) {
      throw new NotFoundException('Flow não encontrado');
    }
    return flow;
  }

  /** Cria um flow validando o grafo — Requisito 4.1/4.2. */
  async createFlow(tenantId: string, dto: UpsertFlowDto) {
    this.validateGraph(dto);

    return withTenant(tenantId, async (tx) => {
      const flow = await tx.flow.create({
        data: { tenantId, name: dto.name, triggerType: dto.triggerType ?? 'manual' },
      });

      // Cria nós e mapeia key -> id gerado.
      const keyToId = new Map<string, string>();
      for (const node of dto.nodes) {
        const created = await tx.flowNode.create({
          data: {
            tenantId,
            flowId: flow.id,
            type: node.type,
            config: (node.config ?? {}) as Prisma.InputJsonValue,
            posX: node.posX ?? 0,
            posY: node.posY ?? 0,
          },
        });
        keyToId.set(node.key, created.id);
      }

      for (const edge of dto.edges ?? []) {
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

      return tx.flow.findUnique({ where: { id: flow.id }, include: { nodes: true, edges: true } });
    });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.getFlow(tenantId, id);
    return withTenant(tenantId, (tx) => tx.flow.update({ where: { id }, data: { status } }));
  }

  async deleteFlow(tenantId: string, id: string) {
    await this.getFlow(tenantId, id);
    await withTenant(tenantId, (tx) => tx.flow.delete({ where: { id } }));
  }

  /** Dispara uma execução do flow — Requisito 4.3. */
  async run(tenantId: string, flowId: string, dto: RunFlowDto) {
    const flow = await withTenant(tenantId, (tx) =>
      tx.flow.findUnique({ where: { id: flowId }, include: { nodes: true } }),
    );
    if (!flow) {
      throw new NotFoundException('Flow não encontrado');
    }
    const start = flow.nodes.find((n) => n.type === 'start');
    if (!start) {
      throw new BadRequestException('Flow sem nó inicial (start)');
    }

    const run = await withTenant(tenantId, (tx) =>
      tx.flowRun.create({
        data: {
          tenantId,
          flowId,
          status: 'running',
          currentNodeId: start.id,
          context: (dto.context ?? {}) as Prisma.InputJsonValue,
        },
      }),
    );

    await this.flowQueue.add('run', { tenantId, runId: run.id }, { jobId: run.id });
    return { runId: run.id, status: run.status };
  }

  listRuns(tenantId: string, flowId: string) {
    return withTenant(tenantId, (tx) =>
      tx.flowRun.findMany({ where: { flowId }, orderBy: { startedAt: 'desc' }, take: 50 }),
    );
  }

  // ---- Validação ----

  private validateGraph(dto: UpsertFlowDto) {
    const keys = new Set<string>();
    for (const node of dto.nodes) {
      if (keys.has(node.key)) {
        throw new BadRequestException(`Nó duplicado: ${node.key}`);
      }
      keys.add(node.key);
    }

    const starts = dto.nodes.filter((n) => n.type === 'start');
    if (starts.length !== 1) {
      throw new BadRequestException('O flow deve ter exatamente um nó "start"');
    }

    for (const edge of dto.edges ?? []) {
      if (!keys.has(edge.from) || !keys.has(edge.to)) {
        throw new BadRequestException(`Edge referencia nó inexistente: ${edge.from} -> ${edge.to}`);
      }
    }
  }
}
