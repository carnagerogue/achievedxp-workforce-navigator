import { Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminTokenGuard } from '../auth/admin-token.guard';

/**
 * Operations endpoints — gated behind `Authorization: Bearer <ADMIN_TOKEN>`.
 * Set `ADMIN_TOKEN` on the API service; without it the routes return 503.
 *
 * Triggers enqueue a BullMQ job and return the job id; the heavy work
 * happens on the in-process worker (apps/api/src/ingestion/ingestion.worker.ts).
 * GET /ingestion/status reports queue depth + per-state counts.
 */
@Controller('ingestion')
@UseGuards(AdminTokenGuard)
export class IngestionController {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('run')
  async runAll() {
    const jobId = await this.ingestion.enqueueRunAll('http');
    return { enqueued: true, jobId };
  }

  /**
   * For every US state currently below `min` active jobs, run a targeted
   * Adzuna `where=<state>` query. Use this to guarantee nationwide
   * coverage after an initial run.
   */
  @Post('fill-coverage')
  async fillCoverage(
    @Query('min', new DefaultValuePipe(10), ParseIntPipe) min: number,
  ) {
    const jobId = await this.ingestion.enqueueFillStateCoverage(
      Math.min(Math.max(min, 1), 200),
    );
    return { enqueued: true, jobId };
  }

  /** Queue depth + per-state counters. Useful for ops dashboards. */
  @Get('status')
  async status() {
    return this.ingestion.getQueueStatus();
  }

  /**
   * One-shot cleanup: null-out salaries above an implausible threshold
   * across active jobs. Used after a parser bug to remove obviously-
   * garbage values until the next ingest re-parses correctly.
   */
  @Post('null-bad-salaries')
  async nullBadSalaries(
    @Query('over', new DefaultValuePipe(300_000), ParseIntPipe) over: number,
  ) {
    const result = await this.prisma.job.updateMany({
      where: {
        OR: [
          { salaryMin: { gt: over } },
          { salaryMax: { gt: over } },
        ],
      },
      data: { salaryMin: null, salaryMax: null },
    });
    return { nulledRows: result.count, threshold: over };
  }
}
