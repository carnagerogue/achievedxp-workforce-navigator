import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { InsightsService } from './insights.service';
import { ScoringModule } from '../scoring/scoring.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ScoringModule, AuthModule],
  controllers: [MatchesController],
  providers: [MatchesService, InsightsService],
  exports: [MatchesService, InsightsService],
})
export class MatchesModule {}
