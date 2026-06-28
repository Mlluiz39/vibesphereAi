import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE } from '@vibesphere/shared';

export const INGESTION_QUEUE = 'INGESTION_QUEUE';
export const MESSAGES_QUEUE = 'MESSAGES_QUEUE';
export const FLOW_QUEUE = 'FLOW_QUEUE';
export const REDIS_CONNECTION = 'REDIS_CONNECTION';

/**
 * Fornece a conexão Redis e as filas (produtor):
 * - document-ingestion: pipeline RAG
 * - inbound-messages: orquestração de conversa
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
          connection: connection as any,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        }),
    },
    {
      provide: MESSAGES_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) =>
        new Queue(QUEUE.INBOUND_MESSAGES, {
          connection: connection as any,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1500 },
            removeOnComplete: 200,
            removeOnFail: 1000,
          },
        }),
    },
    {
      provide: FLOW_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) =>
        new Queue(QUEUE.FLOW_RUNS, {
          connection: connection as any,
          defaultJobOptions: {
            attempts: 1,
            removeOnComplete: 200,
            removeOnFail: 1000,
          },
        }),
    },
  ],
  exports: [INGESTION_QUEUE, MESSAGES_QUEUE, FLOW_QUEUE, REDIS_CONNECTION],
})
export class QueueModule {}
