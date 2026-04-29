import { Controller, DefaultValuePipe, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminKeyGuard } from '../common/admin-key.guard';

/**
 * Operator endpoints. All routes require the AdminKeyGuard, which checks
 * the `x-admin-api-key` (or `Authorization: Bearer <key>`) header against
 * the `ADMIN_API_KEY` env var. If `ADMIN_API_KEY` is unset (dev), the
 * guard is a no-op — local pnpm workflows are unaffected.
 */
@UseGuards(AdminKeyGuard)
@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('run')
  runAll() {
    return this.ingestion.runAll();
  }

  /**
   * For every US state currently below `min` active jobs, run a targeted
   * Adzuna `where=<state>` query. Use this to guarantee nationwide
   * coverage after an initial run.
   */
  @Post('fill-coverage')
  fillCoverage(
    @Query('min', new DefaultValuePipe(10), ParseIntPipe) min: number,
  ) {
    return this.ingestion.fillStateCoverage(Math.min(Math.max(min, 1), 200));
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
