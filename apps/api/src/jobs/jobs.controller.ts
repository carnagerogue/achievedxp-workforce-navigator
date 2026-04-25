import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { StatsService } from './stats.service';
import { ListJobsDto } from './dto/list-jobs.dto';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly stats: StatsService,
  ) {}

  @Get()
  list(@Query() query: ListJobsDto) {
    return this.jobs.list(query);
  }

  @Get('stats')
  getStats() {
    return this.stats.jobsStats();
  }

  @Post('bulk')
  bulk(@Body() body: { ids: string[] }) {
    return this.jobs.findByIds(Array.isArray(body?.ids) ? body.ids.slice(0, 50) : []);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.jobs.findById(id);
  }

  @Get(':id/similar')
  findSimilar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ) {
    return this.jobs.findSimilar(id, Math.min(Math.max(limit, 1), 12));
  }
}
