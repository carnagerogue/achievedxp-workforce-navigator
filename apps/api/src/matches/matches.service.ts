import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Job, UserProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SCORER, Scorer, ScoreBreakdown } from '../scoring/scorer.types';

export interface ScoredJob {
  jobId: string;
  score: number;
  breakdown: ScoreBreakdown;
  explanation: string;
  job: PublicJobSummary;
}

export interface AvoidJob {
  jobId: string;
  reasons: string[];
  score: number;
  job: PublicJobSummary;
}

export interface PublicJobSummary {
  id: string;
  title: string;
  company: string;
  locationCity: string | null;
  locationRegion: string | null;
  industry: string | null;
  riskTier: string;
  backgroundCheckLikely: boolean;
  excludesFelons: boolean;
  applyUrl: string;
  postedAt: Date | null;
}

export interface MatchesResponse {
  userId: string;
  counts: { top: number; medium: number; avoid: number; pool: number };
  topMatches: ScoredJob[];
  mediumMatches: ScoredJob[];
  avoid: AvoidJob[];
}

const TOP_THRESHOLD = 70;
const MEDIUM_THRESHOLD = 40;
/** How many recent jobs we pull for scoring. Phase 4 will prefilter further. */
const CANDIDATE_POOL_SIZE = 500;

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCORER) private readonly scorer: Scorer,
  ) {}

  async getMatches(userId: string, topLimit = 20): Promise<MatchesResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { convictions: true } } },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (!user.profile) {
      throw new NotFoundException(
        `User ${userId} has no profile yet — POST /profile before requesting matches.`,
      );
    }
    const { convictions, ...profile } = user.profile;

    const candidates = await this.prisma.job.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
      take: CANDIDATE_POOL_SIZE,
    });

    const scored = candidates.map((job) => {
      const result = this.scorer.score({
        profile: profile as UserProfile,
        convictions,
        job,
      });
      return { job, result };
    });

    const topMatches: ScoredJob[] = [];
    const mediumMatches: ScoredJob[] = [];
    const avoid: AvoidJob[] = [];

    for (const { job, result } of scored) {
      const summary = this.toPublicSummary(job);

      if (result.disqualified) {
        avoid.push({
          jobId: job.id,
          reasons: result.disqualificationReasons,
          score: result.score,
          job: summary,
        });
        continue;
      }

      const payload: ScoredJob = {
        jobId: job.id,
        score: result.score,
        breakdown: result.breakdown,
        explanation: result.explanation,
        job: summary,
      };

      if (result.score >= TOP_THRESHOLD) topMatches.push(payload);
      else if (result.score >= MEDIUM_THRESHOLD) mediumMatches.push(payload);
      // Below MEDIUM_THRESHOLD and not disqualified → silently dropped.
      // They'd be noise on the dashboard and aren't actionable.
    }

    topMatches.sort((a, b) => b.score - a.score);
    mediumMatches.sort((a, b) => b.score - a.score);
    avoid.sort((a, b) => b.score - a.score);

    const limitedTop = topMatches.slice(0, topLimit);
    const limitedMedium = mediumMatches.slice(0, topLimit);
    const limitedAvoid = avoid.slice(0, topLimit);

    // Persist the scored (non-disqualified) set for later feedback/analysis.
    // Fire-and-forget: if the write fails, the response is still returned.
    this.persistScores(userId, [...limitedTop, ...limitedMedium]).catch((err) =>
      this.logger.warn(`Failed to persist scores for ${userId}: ${(err as Error).message}`),
    );

    return {
      userId,
      counts: {
        top: topMatches.length,
        medium: mediumMatches.length,
        avoid: avoid.length,
        pool: candidates.length,
      },
      topMatches: limitedTop,
      mediumMatches: limitedMedium,
      avoid: limitedAvoid,
    };
  }

  private async persistScores(userId: string, rows: ScoredJob[]) {
    if (rows.length === 0) return;
    // One transaction, N upserts. Cheap for Phase 2's scale; Phase 8 will
    // switch to a bulk write with `createMany` + a companion delete.
    await this.prisma.$transaction(
      rows.map((r) =>
        this.prisma.jobScore.upsert({
          where: { userId_jobId: { userId, jobId: r.jobId } },
          create: {
            userId,
            jobId: r.jobId,
            score: r.score,
            breakdown: r.breakdown as unknown as object,
            explanation: r.explanation,
          },
          update: {
            score: r.score,
            breakdown: r.breakdown as unknown as object,
            explanation: r.explanation,
            computedAt: new Date(),
          },
        }),
      ),
    );
  }

  private toPublicSummary(job: Job): PublicJobSummary {
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      locationCity: job.locationCity,
      locationRegion: job.locationRegion,
      industry: job.industry,
      riskTier: job.riskTier,
      backgroundCheckLikely: job.backgroundCheckLikely,
      excludesFelons: job.excludesFelons,
      applyUrl: job.applyUrl,
      postedAt: job.postedAt,
    };
  }
}
