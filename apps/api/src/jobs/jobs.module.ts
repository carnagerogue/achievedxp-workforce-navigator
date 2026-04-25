import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { StatsService } from './stats.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, StatsService],
  exports: [JobsService, StatsService],
})
export class JobsModule {}
