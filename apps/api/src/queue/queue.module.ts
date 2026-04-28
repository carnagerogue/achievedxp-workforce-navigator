import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

/**
 * Single Redis-backed BullMQ queue for ingestion jobs.
 *
 * Phase 4-and-onwards posture: in-process workers consume the queue
 * alongside the API. The queue exists primarily so that:
 *   - Cron-driven ingestion enqueues a job and returns instantly,
 *     instead of holding the request thread for 10 minutes.
 *   - Manual triggers via /ingestion/run get a job id back so callers
 *     can poll status.
 *   - Failed runs retry with exponential backoff rather than dropping.
 *   - A future Railway worker-service deployment can scale the worker
 *     independently of the API by running the same code with a flag
 *     that disables HTTP and only consumes the queue.
 *
 * If REDIS_HOST is unset we fail fast at boot rather than silently fall
 * back to inline execution — the cron writes still need a target queue.
 */

export const INGESTION_QUEUE = 'ingestion';
export const INGESTION_QUEUE_TOKEN = 'BULL_QUEUE_INGESTION';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: INGESTION_QUEUE_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST');
        const port = Number(config.get<string>('REDIS_PORT') ?? '6379');
        if (!host) {
          throw new Error(
            'REDIS_HOST is required for the ingestion queue. Set it on the API service.',
          );
        }
        return new Queue(INGESTION_QUEUE, {
          connection: { host, port },
          defaultJobOptions: {
            // 3 attempts with exponential backoff: 1s, 5s, 25s. Keeps
            // transient upstream blips from costing us a whole run.
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            // Keep the last 50 completed + 200 failed for observability.
            removeOnComplete: { age: 24 * 3600, count: 50 },
            removeOnFail: { age: 7 * 24 * 3600, count: 200 },
          },
        });
      },
    },
  ],
  exports: [INGESTION_QUEUE_TOKEN],
})
export class QueueModule {}
