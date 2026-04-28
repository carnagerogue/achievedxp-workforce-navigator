import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';

import { IngestionService, IngestSummary } from './ingestion.service';
import { INGESTION_QUEUE } from '../queue/queue.module';

export type IngestionJobName = 'run_all' | 'fill_state_coverage';

export interface IngestionRunAllPayload {
  triggeredBy: 'cron' | 'http' | 'boot';
}
export interface IngestionFillStateCoveragePayload {
  triggeredBy: 'http';
  min: number;
}
export type IngestionJobPayload = IngestionRunAllPayload | IngestionFillStateCoveragePayload;

/**
 * In-process BullMQ worker for ingestion jobs. Lives next to the API
 * for now (Phase 4 minimum). When a Railway worker service split is
 * desired, the same Worker class can be moved into a standalone bootstrap
 * (no HTTP) and disabled here via a `WORKER_ENABLED=false` flag.
 *
 * Concurrency = 1 because each ingestion run hits the same upstream
 * APIs and the same DB upsert paths; running two in parallel would just
 * double our chance of tripping a rate limit.
 */
@Injectable()
export class IngestionWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(IngestionWorker.name);
  private worker?: Worker;

  constructor(
    private readonly ingestion: IngestionService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('WORKER_DISABLED') === 'true') {
      this.logger.log('WORKER_DISABLED=true — skipping ingestion worker startup');
      return;
    }
    const host = this.config.get<string>('REDIS_HOST');
    const port = Number(this.config.get<string>('REDIS_PORT') ?? '6379');
    if (!host) {
      this.logger.error('REDIS_HOST missing — ingestion worker cannot start');
      return;
    }

    this.worker = new Worker<IngestionJobPayload, IngestSummary[] | unknown>(
      INGESTION_QUEUE,
      async (job) => {
        this.logger.log(`Processing ${job.name} (id=${job.id}, triggeredBy=${(job.data as IngestionJobPayload).triggeredBy})`);
        if (job.name === 'run_all') {
          return this.ingestion.runAll();
        }
        if (job.name === 'fill_state_coverage') {
          const min = (job.data as IngestionFillStateCoveragePayload).min ?? 10;
          return this.ingestion.fillStateCoverage(min);
        }
        throw new Error(`Unknown ingestion job: ${job.name}`);
      },
      {
        connection: { host, port },
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} (${job.name}) completed`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.warn(`Job ${job?.id} (${job?.name}) failed on attempt ${job?.attemptsMade}: ${err.message}`);
    });
    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err.message}`);
    });
    this.logger.log('Ingestion worker started');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.worker) {
      this.logger.log('Closing ingestion worker (waiting for in-flight job)…');
      await this.worker.close();
    }
  }
}
