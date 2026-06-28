import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE } from '@vibesphere/shared';
import { IngestionJobData, markIngestionError, processIngestion } from './ingestion';
import { InboundJobData, processInboundMessage } from './engine';
import { FlowRunJobData, processFlowRun } from './flow';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function createConnection(): IORedis {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 10) {
        console.error('[redis] não conseguiu conectar após 10 tentativas. Encerrando.');
        process.exit(1);
      }
      return Math.min(times * 200, 3000);
    },
  });
}

let connection: IORedis;

function waitForConnection(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (connection.status === 'ready') {
      resolve();
      return;
    }
    connection.once('ready', resolve);
    connection.once('error', (err) => reject(err));
  });
}

connection = createConnection();

connection.on('error', (err) => {
  if (err.message.includes('ECONNREFUSED')) {
    console.warn(`[redis] aguardando redis em ${REDIS_URL}...`);
  }
});

async function bootstrap() {
  try {
    await waitForConnection();
  } catch (err) {
    console.error(`[redis] falha ao conectar em ${REDIS_URL}: ${(err as Error).message}`);
    process.exit(1);
  }

  const ingestionWorker = new Worker<IngestionJobData>(
    QUEUE.DOCUMENT_INGESTION,
    async (job) => {
      const result = await processIngestion(job.data);
      console.log(`[ingestion] documento ${job.data.documentId}: ${result.chunks} chunks`);
      return result;
    },
    { connection: connection as any, concurrency: 3 },
  );

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
    { connection: connection as any, concurrency: 5 },
  );

  messageWorker.on('failed', (job, err) => {
    console.error(`[messages] job ${job?.id} falhou: ${err.message}`);
  });

  const flowWorker = new Worker<FlowRunJobData>(
    QUEUE.FLOW_RUNS,
    async (job) => {
      await processFlowRun(job.data);
    },
    { connection: connection as any, concurrency: 5 },
  );

  flowWorker.on('failed', (job, err) => {
    console.error(`[flows] run ${job?.data?.runId} falhou: ${err.message}`);
  });

  console.log('VibeSphere workers iniciados (ingestion, messages, flows).');
}

bootstrap();
