import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE } from '@vibesphere/shared';
import { IngestionJobData, markIngestionError, processIngestion } from './ingestion';
import { InboundJobData, processInboundMessage } from './engine';
import { FlowRunJobData, processFlowRun } from './flow';

/**
 * Ponto de entrada dos workers BullMQ.
 * - document-ingestion: pipeline RAG (extração -> chunking -> embeddings -> pgvector) [Tarefa 7]
 * - inbound-messages: orquestração de conversa [Tarefa 9 — stub]
 */
const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const ingestionWorker = new Worker<IngestionJobData>(
  QUEUE.DOCUMENT_INGESTION,
  async (job) => {
    const result = await processIngestion(job.data);
    console.log(`[ingestion] documento ${job.data.documentId}: ${result.chunks} chunks`);
    return result;
  },
  { connection, concurrency: 3 },
);

// Quando as retentativas se esgotam, marca o documento como erro (Req 6.5).
ingestionWorker.on('failed', async (job, err) => {
  console.error(`[ingestion] job ${job?.id} falhou: ${err.message}`);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await markIngestionError(job.data, err.message);
  }
});

const messageWorker = new Worker<InboundJobData>(
  QUEUE.INBOUND_MESSAGES,
  async (job) => {
    await processInboundMessage(job.data);
  },
  { connection, concurrency: 5 },
);

messageWorker.on('failed', (job, err) => {
  console.error(`[messages] job ${job?.id} falhou: ${err.message}`);
});

const flowWorker = new Worker<FlowRunJobData>(
  QUEUE.FLOW_RUNS,
  async (job) => {
    await processFlowRun(job.data);
  },
  { connection, concurrency: 5 },
);

flowWorker.on('failed', (job, err) => {
  console.error(`[flows] run ${job?.data?.runId} falhou: ${err.message}`);
});

console.log('VibeSphere workers iniciados (ingestion, messages, flows).');
