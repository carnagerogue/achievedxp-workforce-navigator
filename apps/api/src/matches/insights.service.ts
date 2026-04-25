import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Conviction, Job, UserProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SCORER, Scorer, ScoreResult } from '../scoring/scorer.types';

export interface InsightItem {
  /** Kind of addition this suggestion represents. */
  kind: 'certification' | 'skill';
  /** Identifier as it appears on job postings (e.g. "osha_10"). */
  code: string;
  /** Pretty label (e.g. "OSHA 10-Hour"). */
  label: string;
  /** How many MORE top-matches this would unlock. */
  unlocks: number;
  /** How many medium-matches this would push into top. */
  promotesToTop: number;
  /** Total active jobs in the pool that required this item. */
  demand: number;
}

export interface InsightsResponse {
  userId: string;
  currentTop: number;
  currentMedium: number;
  items: InsightItem[];
}

/**
 * Computes certification / skill additions that would most improve the user's
 * match portfolio. Brute-force but bounded: we snapshot the top `CANDIDATE_POOL_SIZE`
 * recent jobs, score each with the user's current profile, then for each
 * candidate addition re-score the jobs it would affect and count the delta.
 *
 * Design intent: the recommendation is explained by the data itself, not a
 * model. "Complete OSHA 10 → unlock 8 top matches" is auditable: the caller
 * can drill into the matches endpoint and see the exact postings.
 */
@Injectable()
export class InsightsService {
  private readonly CANDIDATE_POOL_SIZE = 500;
  private readonly TOP = 70;
  private readonly MEDIUM = 40;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCORER) private readonly scorer: Scorer,
  ) {}

  async forUser(userId: string): Promise<InsightsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { convictions: true } } },
    });
    if (!user?.profile) throw new NotFoundException(`No profile for user ${userId}`);
    const { convictions, ...profile } = user.profile;

    const jobs = await this.prisma.job.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
      take: this.CANDIDATE_POOL_SIZE,
    });

    // Baseline score for every job.
    const baseline = jobs.map((job) => ({
      job,
      result: this.scorer.score({ profile: profile as UserProfile, convictions, job }),
    }));

    const currentTop    = baseline.filter((b) => !b.result.disqualified && b.result.score >= this.TOP).length;
    const currentMedium = baseline.filter((b) => !b.result.disqualified && b.result.score >= this.MEDIUM && b.result.score < this.TOP).length;

    // Candidate additions = anything required by at least one job that the
    // profile doesn't already list. Counting demand gives us a quick filter.
    const certDemand  = new Map<string, number>();
    const skillDemand = new Map<string, number>();
    for (const job of jobs) {
      for (const c of job.requiredCertifications) {
        if (profile.certifications.includes(c)) continue;
        certDemand.set(c, (certDemand.get(c) ?? 0) + 1);
      }
      for (const s of job.requiredSkills) {
        if (profile.skills.includes(s)) continue;
        skillDemand.set(s, (skillDemand.get(s) ?? 0) + 1);
      }
    }

    // Pretty-label maps (only worth a DB call for items that actually appear).
    const [certRegistry, skillRegistry] = await Promise.all([
      certDemand.size > 0
        ? this.prisma.certification.findMany({ where: { code: { in: [...certDemand.keys()] } }, select: { code: true, displayName: true } })
        : Promise.resolve([]),
      skillDemand.size > 0
        ? this.prisma.skill.findMany({ where: { code: { in: [...skillDemand.keys()] } }, select: { code: true, displayName: true } })
        : Promise.resolve([]),
    ]);
    const certLabel  = new Map(certRegistry.map((r) => [r.code, r.displayName]));
    const skillLabel = new Map(skillRegistry.map((r) => [r.code, r.displayName]));

    // For each candidate, simulate adding it and count the deltas.
    const items: InsightItem[] = [];
    for (const [code, demand] of certDemand) {
      const simulated = { ...profile, certifications: [...profile.certifications, code] } as UserProfile;
      const delta = this.computeDelta(baseline, simulated, convictions);
      if (delta.unlocks + delta.promotesToTop > 0) {
        items.push({
          kind: 'certification',
          code,
          label: certLabel.get(code) ?? prettifyCode(code),
          unlocks: delta.unlocks,
          promotesToTop: delta.promotesToTop,
          demand,
        });
      }
    }
    for (const [code, demand] of skillDemand) {
      const simulated = { ...profile, skills: [...profile.skills, code] } as UserProfile;
      const delta = this.computeDelta(baseline, simulated, convictions);
      if (delta.unlocks + delta.promotesToTop > 0) {
        items.push({
          kind: 'skill',
          code,
          label: skillLabel.get(code) ?? prettifyCode(code),
          unlocks: delta.unlocks,
          promotesToTop: delta.promotesToTop,
          demand,
        });
      }
    }

    // Sort by impact: unlocks count twice because moving a job *into* the pool
    // is more valuable than moving a medium match into top.
    items.sort((a, b) =>
      (b.unlocks * 2 + b.promotesToTop) - (a.unlocks * 2 + a.promotesToTop),
    );

    return { userId, currentTop, currentMedium, items: items.slice(0, 6) };
  }

  private computeDelta(
    baseline: { job: Job; result: ScoreResult }[],
    simulated: UserProfile,
    convictions: Conviction[],
  ): { unlocks: number; promotesToTop: number } {
    let unlocks = 0;
    let promotesToTop = 0;
    for (const b of baseline) {
      if (b.result.disqualified) continue;                    // hard filter stays
      const next = this.scorer.score({ profile: simulated, convictions, job: b.job });
      if (next.disqualified) continue;
      const wasTop    = b.result.score >= this.TOP;
      const wasMedium = b.result.score >= this.MEDIUM && b.result.score < this.TOP;
      const isTop     = next.score      >= this.TOP;
      const isMedium  = next.score      >= this.MEDIUM && next.score < this.TOP;
      if (!wasTop && !wasMedium && (isTop || isMedium)) unlocks++;
      else if (wasMedium && isTop)                       promotesToTop++;
    }
    return { unlocks, promotesToTop };
  }
}

function prettifyCode(code: string): string {
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
