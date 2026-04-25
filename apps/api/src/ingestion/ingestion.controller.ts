import { Controller, DefaultValuePipe, ParseIntPipe, Post, Query } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

/**
 * Manual-trigger endpoint for dev/testing. Phase 4 will lock this behind
 * admin auth + queue it to BullMQ instead of running inline.
 */
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

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
}
