import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QUESTIONS, RIASEC_LABELS, RIASEC_TO_INDUSTRIES, RiasecCode } from './questions.data';
import { OCCUPATIONS, occupationFit } from './occupations.data';

export interface AssessmentSubmission {
  /** Map of questionId → Likert rating (1..5). All 30 ids must be present. */
  answers: Record<number, number>;
}

export interface RiasecScores {
  R: number; I: number; A: number; S: number; E: number; C: number;
}

export interface OccupationMatch {
  onetCode: string;
  title: string;
  hollandCode: string;
  jobZone: number;
  description: string;
  preparation: string;
  typicalWage: string;
  industry: string | null;
  fairChanceFriendly: boolean;
  fitPercent: number;
  /** How many active postings in our catalog match this occupation's keywords. */
  liveJobCount: number;
  /** Convenience query string that drives the /jobs deep-link. */
  jobsQuery: string;
}

export interface AssessmentResult {
  userId: string;
  scores: RiasecScores;
  /** Three-letter Holland Code, highest to lowest (e.g. "RSC"). */
  hollandCode: string;
  /** The top 2 dimensions with pretty names + blurbs. */
  topDimensions: Array<{ code: RiasecCode; name: string; blurb: string; score: number }>;
  /** Industry tags our catalog uses that align with the top dimensions. */
  recommendedIndustries: string[];
  /**
   * Concrete career suggestions ranked by fit. Each entry includes a live
   * count of matching jobs in the catalog so the candidate can jump
   * straight to actionable postings, not abstract industries.
   */
  occupations: OccupationMatch[];
  completedAt: string;
}

/**
 * O*NET-style career-interest profiler, implemented locally. We embed the
 * 30-item short form (see questions.data.ts) and score it per standard
 * Holland taxonomy. Results are written back onto the UserProfile so the
 * rule-based scorer can use them as a soft nudge — but never a hard gate;
 * a user who wants a job outside their interest profile shouldn't be
 * filtered out.
 */
@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the static 30-item questionnaire. */
  getQuestions() {
    return {
      questions: QUESTIONS,
      dimensions: RIASEC_LABELS,
      scale: [
        { value: 1, label: 'Strongly dislike' },
        { value: 2, label: 'Dislike' },
        { value: 3, label: 'Unsure' },
        { value: 4, label: 'Like' },
        { value: 5, label: 'Strongly like' },
      ],
    };
  }

  /** Score a user's answers + persist on the profile. */
  async submit(userId: string, submission: AssessmentSubmission): Promise<AssessmentResult> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException(`No profile for user ${userId}`);

    const { answers } = submission;
    if (!answers || typeof answers !== 'object') {
      throw new BadRequestException('answers must be an object of questionId → rating');
    }

    // Validate every question is answered with 1..5.
    const scores: RiasecScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    for (const q of QUESTIONS) {
      const raw = answers[q.id];
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 1 || v > 5) {
        throw new BadRequestException(`Question ${q.id} missing or invalid (expected 1..5, got ${raw})`);
      }
      scores[q.dimension] += v;
    }

    await this.prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        riasecRealistic:     scores.R,
        riasecInvestigative: scores.I,
        riasecArtistic:      scores.A,
        riasecSocial:        scores.S,
        riasecEnterprising:  scores.E,
        riasecConventional:  scores.C,
        riasecCompletedAt:   new Date(),
      },
    });

    return this.buildResult(userId, scores, new Date());
  }

  /** Fetch the user's last result from their profile. */
  async fetch(userId: string): Promise<AssessmentResult | null> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile?.riasecCompletedAt) return null;

    const scores: RiasecScores = {
      R: profile.riasecRealistic     ?? 0,
      I: profile.riasecInvestigative ?? 0,
      A: profile.riasecArtistic      ?? 0,
      S: profile.riasecSocial        ?? 0,
      E: profile.riasecEnterprising  ?? 0,
      C: profile.riasecConventional  ?? 0,
    };
    return this.buildResult(userId, scores, profile.riasecCompletedAt);
  }

  private async buildResult(
    userId: string,
    scores: RiasecScores,
    completedAt: Date,
  ): Promise<AssessmentResult> {
    const sorted = (Object.entries(scores) as Array<[RiasecCode, number]>)
      .sort((a, b) => b[1] - a[1]);
    const hollandCode = sorted.slice(0, 3).map((p) => p[0]).join('');
    const top2 = sorted.slice(0, 2);
    const topDimensions = top2.map(([code, score]) => ({
      code,
      name:  RIASEC_LABELS[code].name,
      blurb: RIASEC_LABELS[code].blurb,
      score,
    }));
    const recommendedIndustries = [...new Set(top2.flatMap(([code]) => RIASEC_TO_INDUSTRIES[code]))];

    const occupations = await this.matchOccupations(scores);

    return {
      userId,
      scores,
      hollandCode,
      topDimensions,
      recommendedIndustries,
      occupations,
      completedAt: completedAt.toISOString(),
    };
  }

  /**
   * Rank our curated occupation list by how well each one fits this user's
   * Holland scores, then enrich the top hits with a live count of matching
   * postings in the jobs catalog. Cap at the top 10 — more than that
   * becomes overwhelming on the results page.
   *
   * Live counts are looked up in parallel via a single queryRaw using
   * `tsvector`-like substring matching; if the lookup fails we still
   * return the ranked list with `liveJobCount: 0` so the page never
   * blocks on the enrichment.
   */
  private async matchOccupations(scores: RiasecScores) {
    const ranked = OCCUPATIONS
      .map((occ) => ({ ...occ, fitPercent: occupationFit(scores, occ) }))
      .filter((occ) => occ.fitPercent > 35)             // drop low-fit noise
      .sort((a, b) => b.fitPercent - a.fitPercent)
      .slice(0, 10);

    const counts = await Promise.all(
      ranked.map(async (occ) => {
        try {
          // First keyword is the most specific; counts jobs where the title
          // contains it (case-insensitive). Cheap because `title` is small
          // and Postgres can use a basic ILIKE without a tsvector index here.
          const firstKeyword = occ.searchKeywords.split(/\s+/)[0];
          const n = await this.prisma.job.count({
            where: {
              status: 'ACTIVE',
              title: { contains: firstKeyword, mode: 'insensitive' },
            },
          });
          return n;
        } catch {
          return 0;
        }
      }),
    );

    return ranked.map((occ, i) => ({
      onetCode:    occ.onetCode,
      title:       occ.title,
      hollandCode: occ.hollandCode,
      jobZone:     occ.jobZone,
      description: occ.description,
      preparation: occ.preparation,
      typicalWage: occ.typicalWage,
      industry:    occ.industry,
      fairChanceFriendly: occ.fairChanceFriendly,
      fitPercent:  occ.fitPercent,
      liveJobCount: counts[i],
      jobsQuery:   `q=${encodeURIComponent(occ.searchKeywords.split(/\s+/)[0])}`,
    }));
  }
}
