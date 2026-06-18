import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE } from '@vibesphere/shared';

/**
 * Ponto de entrada dos workers BullMQ.
 * Fase 1: esqueletos das filas de ingestão de documentos e mensagens inbound.
 * A lógica de cada processador será implementada nas tarefas 7.2 e 9.1 (ver tasks.md).
 */
const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const ingestionWorker = new Worker(
  QUEUE.DOCUMENT_INGESTION,
  async (job) => {
    // TODO 7.2: extrair texto -> chunking -> embeddings -> pgvector
    console.log(`[ingestion] job ${job.id} recebido (stub)`);
  },
  { connection },
);

const messageWorker = new Worker(
  QUEUE.INBOUND_MESSAGES,
  async (job) => {
    // TODO 9.1/9.2: resolver tenant/contato/conversa, persistir e gerar resposta via LLM
    console.log(`[messages] job ${job.id} recebido (stub)`);
  },
  { connection },
);

for (const worker of [ingestionWorker, messageWorker]) {
  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} falhou:`, err.message);
  });
}

console.log('VibeSphere workers iniciados (ingestion, messages).');
