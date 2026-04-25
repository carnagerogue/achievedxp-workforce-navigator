import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { InsightsService } from './insights.service';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [ScoringModule],
  controllers: [MatchesController],
  providers: [MatchesService, InsightsService],
  exports: [MatchesService, InsightsService],
})
export class MatchesModule {}
