import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE } from '@vibesphere/shared';

export const INGESTION_QUEUE = 'INGESTION_QUEUE';
export const REDIS_CONNECTION = 'REDIS_CONNECTION';

/**
 * Fornece a conexão Redis e a fila de ingestão de documentos (produtor).
 * Os jobs são consumidos pelo app `worker`.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      useFactory: () =>
        new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
          maxRetriesPerRequest: null,
        }),
    },
    {
      provide: INGESTION_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) =>
        new Queue(QUEUE.DOCUMENT_INGESTION, {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        }),
    },
  ],
  exports: [INGESTION_QUEUE, REDIS_CONNECTION],
})
export class QueueModule implements OnModuleDestroy {
  constructor() {}

  async onModuleDestroy() {
    // As conexões são fechadas pelo processo ao encerrar; nada a fazer por enquanto.
  }
}
