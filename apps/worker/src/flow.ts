import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE } from '@vibesphere/shared';
import { Prisma, withTenant } from '@vibesphere/database';
import { getChatProvider } from './providers';

export interface FlowRunJobData {
  tenantId: string;
  runId: string;
}

const MAX_STEPS = 50;

type Ctx = { vars: Record<string, unknown>; outputs: string[] };

let flowQueue: Queue | undefined;
function getFlowQueue(): Queue {
  if (!flowQueue) {
    const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    flowQueue = new Queue(QUEUE.FLOW_RUNS, { connection });
  }
  return flowQueue;
}

/** Interpola {{var}} no texto a partir do contexto. */
function interpolate(text: string, vars: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

function evalCondition(config: Record<string, unknown>, vars: Record<string, unknown>): boolean {
  const left = vars[String(config.var ?? '')];
  const op = String(config.op ?? 'exists');
  const value = config.value;
  switch (op) {
    case 'eq':
      return String(left) === String(value);
    case 'neq':
      return String(left) !== String(value);
    case 'contains':
      return String(left ?? '').includes(String(value ?? ''));
    case 'exists':
    default:
      return left !== undefined && left !== null && left !== '';
  }
}

/**
 * Executa um FlowRun caminhando pelos nós a partir do nó atual — Requisito 4.3/4.4.
 * Suporta: start, message, condition, delay, webhook, ai, end.
 * Persiste o estado (currentNodeId/context) e re-enfileira em nós de delay.
 */
export async function processFlowRun(data: FlowRunJobData): Promise<void> {
  const { tenantId, runId } = data;

  const loaded = await withTenant(tenantId, async (tx) => {
    const run = await tx.flowRun.findUnique({ where: { id: runId } });
    if (!run || run.status !== 'running') return null;
    const nodes = await tx.flowNode.findMany({ where: { flowId: run.flowId } });
    const edges = await tx.flowEdge.findMany({ where: { flowId: run.flowId } });
    return { run, nodes, edges };
  });

  if (!loaded) return;
  const { run, nodes, edges } = loaded;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const ctx: Ctx = normalizeContext(run.context);
  let currentId: string | null = run.currentNodeId;
  let steps = 0;

  try {
    while (currentId && steps < MAX_STEPS) {
      steps++;
      const node = nodeById.get(currentId);
      if (!node) break;
      const config = (node.config ?? {}) as Record<string, unknown>;

      let branch: string | undefined;

      switch (node.type) {
        case 'start':
          break;

        case 'message': {
          const text = interpolate(String(config.text ?? ''), ctx.vars);
          ctx.outputs.push(text);
          break;
        }

        case 'ai': {
          const prompt = interpolate(String(config.prompt ?? ''), ctx.vars);
          const provider = getChatProvider(String(config.provider ?? 'openai'));
          const result = await provider.chat({
            model: String(config.model ?? 'gpt-4o-mini'),
            messages: [{ role: 'user', content: prompt }],
          });
          const outVar = String(config.outputVar ?? 'aiOutput');
          ctx.vars[outVar] = result.content;
          ctx.outputs.push(result.content);
          break;
        }

        case 'webhook': {
          const res = await fetch(String(config.url), {
            method: String(config.method ?? 'POST'),
            headers: { 'Content-Type': 'application/json' },
            body: config.body ? JSON.stringify(config.body) : undefined,
          });
          ctx.vars[String(config.outputVar ?? 'webhookStatus')] = res.status;
          break;
        }

        case 'condition': {
          branch = evalCondition(config, ctx.vars) ? 'true' : 'false';
          break;
        }

        case 'delay': {
          const ms = Number(config.ms ?? 1000);
          const next = nextNodeId(edges, currentId);
          await persist(tenantId, runId, next, ctx, 'running');
          // Re-enfileira a continuação após o delay.
          await getFlowQueue().add('run', { tenantId, runId }, { delay: ms, jobId: `${runId}:${Date.now()}` });
          return;
        }

        case 'end':
          await persist(tenantId, runId, null, ctx, 'completed');
          return;

        default:
          break;
      }

      currentId = nextNodeId(edges, currentId, branch);
    }

    await persist(tenantId, runId, null, ctx, 'completed');
  } catch (err) {
    await persist(tenantId, runId, currentId, ctx, 'failed', (err as Error).message);
    throw err;
  }
}

function normalizeContext(raw: unknown): Ctx {
  const obj = (raw ?? {}) as Partial<Ctx>;
  return { vars: obj.vars ?? {}, outputs: obj.outputs ?? [] };
}

/** Próximo nó: para condição, segue a edge com label do branch; senão a primeira. */
function nextNodeId(
  edges: { fromNodeId: string; toNodeId: string; label: string | null }[],
  fromId: string,
  branch?: string,
): string | null {
  const outgoing = edges.filter((e) => e.fromNodeId === fromId);
  if (outgoing.length === 0) return null;
  if (branch) {
    const match = outgoing.find((e) => e.label === branch);
    if (match) return match.toNodeId;
  }
  return outgoing[0].toNodeId;
}

async function persist(
  tenantId: string,
  runId: string,
  currentNodeId: string | null,
  ctx: Ctx,
  status: string,
  error?: string,
) {
  await withTenant(tenantId, (tx) =>
    tx.flowRun.update({
      where: { id: runId },
      data: {
        currentNodeId,
        context: ctx as unknown as Prisma.InputJsonValue,
        status,
        error,
        finishedAt: status === 'running' ? null : new Date(),
      },
    }),
  );
}
