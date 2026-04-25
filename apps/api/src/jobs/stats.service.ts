import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Bucket { key: string; label: string; count: number }
export interface SalaryBand { label: string; count: number; min: number | null; max: number | null }

export interface JobsStatsResponse {
  totals: {
    active: number;
    fairChanceFriendly: number;      // !excludesFelons
    remote: number;
    apprenticeships: number;
    withSalary: number;
    postedLast7Days: number;
    postedLast30Days: number;
  };
  byIndustry: Bucket[];
  byRegion: Bucket[];
  bySource: Bucket[];
  byRiskTier: Bucket[];
  salaryBands: SalaryBand[];
  topCertifications: Bucket[];
  topSkills: Bucket[];
}

/**
 * Pre-aggregated view of the current job pool. Drives the Market Insights
 * page. Deliberately a single endpoint so the frontend can render every
 * chart from one round-trip — avoids an n+1 of per-axis queries.
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async jobsStats(): Promise<JobsStatsResponse> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7  * 86_400_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    const activeWhere = { status: 'ACTIVE' as const };

    const [
      active, fairChance, remote, apprenticeships, withSalary, last7, last30,
      byIndustryRaw, byRegionRaw, bySourceRaw, byRiskRaw,
      salaryCounts, jobsForArrays,
    ] = await Promise.all([
      this.prisma.job.count({ where: activeWhere }),
      this.prisma.job.count({ where: { ...activeWhere, excludesFelons: false } }),
      this.prisma.job.count({ where: { ...activeWhere, remote: true } }),
      this.prisma.job.count({ where: { ...activeWhere, isApprenticeship: true } }),
      this.prisma.job.count({ where: { ...activeWhere, OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }] } }),
      this.prisma.job.count({ where: { ...activeWhere, postedAt: { gte: sevenDaysAgo } } }),
      this.prisma.job.count({ where: { ...activeWhere, postedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.job.groupBy({
        by: ['industry'],
        where: { ...activeWhere, industry: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.job.groupBy({
        by: ['locationRegion'],
        where: { ...activeWhere, locationRegion: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.job.groupBy({
        by: ['sourceId'],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.job.groupBy({
        by: ['riskTier'],
        where: activeWhere,
        _count: { _all: true },
      }),
      // Salary bands computed in-process (SQL grouping by numeric ranges is
      // dialect-specific; the data is small enough to band in memory).
      this.prisma.job.findMany({
        where: { ...activeWhere, OR: [{ salaryMin: { not: null } }, { salaryMax: { not: null } }] },
        select: { salaryMin: true, salaryMax: true },
      }),
      this.prisma.job.findMany({
        where: activeWhere,
        select: { requiredCertifications: true, requiredSkills: true },
      }),
    ]);

    // Pretty-print source codes via a single lookup (~4 rows).
    const sources = await this.prisma.jobSource.findMany({
      where: { id: { in: bySourceRaw.map((r) => r.sourceId) } },
      select: { id: true, code: true, displayName: true },
    });
    const sourceNameById = new Map(sources.map((s) => [s.id, { code: s.code, label: s.displayName }]));

    const byIndustry: Bucket[] = byIndustryRaw
      .map((r) => ({ key: r.industry!, label: r.industry!.replace(/_/g, ' '), count: r._count._all }))
      .sort((a, b) => b.count - a.count);
    const byRegion: Bucket[] = byRegionRaw
      .map((r) => ({ key: r.locationRegion!, label: r.locationRegion!, count: r._count._all }))
      .sort((a, b) => b.count - a.count);
    const bySource: Bucket[] = bySourceRaw
      .map((r) => {
        const named = sourceNameById.get(r.sourceId);
        return { key: named?.code ?? r.sourceId, label: named?.label ?? r.sourceId, count: r._count._all };
      })
      .sort((a, b) => b.count - a.count);
    const byRiskTier: Bucket[] = byRiskRaw
      .map((r) => ({ key: r.riskTier, label: r.riskTier.toLowerCase(), count: r._count._all }))
      .sort((a, b) => b.count - a.count);

    const bandDefs: Array<{ label: string; min: number | null; max: number | null }> = [
      { label: 'Under $30k',   min: null, max: 30_000 },
      { label: '$30k – $50k',  min: 30_000, max: 50_000 },
      { label: '$50k – $75k',  min: 50_000, max: 75_000 },
      { label: '$75k – $100k', min: 75_000, max: 100_000 },
      { label: '$100k +',      min: 100_000, max: null },
    ];
    const salaryBands: SalaryBand[] = bandDefs.map((b) => ({
      label: b.label,
      min: b.min,
      max: b.max,
      count: salaryCounts.filter((s) => {
        const pivot = s.salaryMin ?? s.salaryMax ?? 0;
        if (b.min != null && pivot < b.min) return false;
        if (b.max != null && pivot >= b.max) return false;
        return true;
      }).length,
    }));

    const certMap  = new Map<string, number>();
    const skillMap = new Map<string, number>();
    for (const j of jobsForArrays) {
      for (const c of j.requiredCertifications) certMap.set(c,  (certMap.get(c)  ?? 0) + 1);
      for (const s of j.requiredSkills)         skillMap.set(s, (skillMap.get(s) ?? 0) + 1);
    }
    const toBuckets = (m: Map<string, number>): Bucket[] =>
      [...m.entries()]
        .map(([key, count]) => ({ key, label: key.replace(/_/g, ' '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
      totals: {
        active,
        fairChanceFriendly: fairChance,
        remote,
        apprenticeships,
        withSalary,
        postedLast7Days: last7,
        postedLast30Days: last30,
      },
      byIndustry,
      byRegion,
      bySource,
      byRiskTier,
      salaryBands,
      topCertifications: toBuckets(certMap),
      topSkills: toBuckets(skillMap),
    };
  }
}
