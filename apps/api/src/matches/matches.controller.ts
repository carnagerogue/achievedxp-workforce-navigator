import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Query } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { InsightsService } from './insights.service';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matches: MatchesService,
    private readonly insights: InsightsService,
  ) {}

  /**
   * Returns three buckets for one user:
   *   - topMatches:    score ≥ 70, passed all hard filters
   *   - mediumMatches: score 40–69, passed all hard filters
   *   - avoid:         disqualified by a hard legal filter (with reasons)
   *
   * The `limit` query param caps each bucket's length (default 20).
   */
  @Get(':userId')
  getMatches(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.matches.getMatches(userId, Math.min(Math.max(limit, 1), 100));
  }

  /**
   * Data-driven growth recommendations: "Complete X → unlock N jobs."
   * Simulates adding each candidate certification/skill to the user's
   * profile and counts how many more jobs enter the top/medium buckets.
   */
  @Get(':userId/insights')
  getInsights(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.insights.forUser(userId);
  }
}
