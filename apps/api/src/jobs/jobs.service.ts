import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListJobsDto } from './dto/list-jobs.dto';
import { buildOffenseExclusionWhere } from '../scoring/offense-filters';
import { LocationService } from '../location/location.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly location: LocationService,
  ) {}

  async list(query: ListJobsDto) {
    const andClauses: Prisma.JobWhereInput[] = [{ status: query.status ?? 'ACTIVE' }];
    if (query.region)   andClauses.push({ locationRegion: query.region });
    if (query.city) {
      andClauses.push({ locationCity: { contains: query.city, mode: 'insensitive' } });
    }
    if (query.industry) andClauses.push({ industry: query.industry });
    if (query.riskTier) andClauses.push({ riskTier: query.riskTier });
    if (query.remote !== undefined) andClauses.push({ remote: query.remote });

    // Salary floor — prefer the max salary; fall back to the min if the
    // posting only lists a single figure.
    if (query.minSalary && query.minSalary > 0) {
      andClauses.push({
        OR: [
          { salaryMax: { gte: query.minSalary } },
          { AND: [{ salaryMax: null }, { salaryMin: { gte: query.minSalary } }] },
        ],
      });
    }

    // "Posted within the last N days" — inclusive.
    if (query.postedWithinDays && query.postedWithinDays > 0) {
      const since = new Date(Date.now() - query.postedWithinDays * 86_400_000);
      andClauses.push({ postedAt: { gte: since } });
    }

    if (query.apprenticeshipsOnly) andClauses.push({ isApprenticeship: true });
    if (query.q) {
      andClauses.push({
        OR: [
          { title:   { contains: query.q, mode: 'insensitive' } },
          { company: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }

    // ─── ZIP-code filter ──────────────────────────────────────────────
    //
    // Real providers (USAJobs, Adzuna) tag postings with city + state, NOT
    // ZIP. A naive `WHERE locationPostalCode IN (...)` query would never
    // match anything in the canonical catalog. So when a ZIP is given we
    // expand it to the set of cities within the radius and match on
    // (locationCity, locationRegion) pairs instead. The state code also
    // serves as a hard scope so a city like "Springfield" can't match
    // across multiple states.
    if (query.postalCode) {
      const center = this.location.lookup(query.postalCode);
      if (!center) {
        // ZIP isn't in our database — return zero results rather than
        // silently falling back to "all jobs" which would be misleading.
        andClauses.push({ id: '__no_such_zip__' });
      } else if (query.radiusMiles && query.radiusMiles > 0) {
        const cities = this.location.citiesWithinRadius(query.postalCode, query.radiusMiles);
        if (cities.length === 0) {
          andClauses.push({ id: '__no_cities_in_radius__' });
        } else {
          // Build an OR of (city startsWith ... AND region = ...) clauses.
          // We use startsWith rather than equals because providers write
          // city names differently — USAJobs writes "Everett, Washington"
          // while Adzuna writes just "Everett". `startsWith` matches both
          // without producing false positives like "Everett" → "Eastern".
          // Combined with the state-code restriction, cross-state collisions
          // (e.g. multiple "Springfields") are also impossible.
          andClauses.push({
            OR: cities.map((c) => ({
              AND: [
                { locationRegion: c.state },
                { locationCity: { startsWith: c.city, mode: 'insensitive' } },
              ],
            })),
          });
        }
      } else {
        // Exact-ZIP with no radius → pinpoint the ZIP's home city + state.
        andClauses.push({
          AND: [
            { locationRegion: center.state },
            { locationCity: { startsWith: center.city, mode: 'insensitive' } },
          ],
        });
      }
    }

    // Browse-by-conviction — apply the same offense × industry/title bars
    // the scorer uses. When offenseType is set we default hideFelonExclusions
    // on unless the caller explicitly said false.
    if (query.offenseType) {
      const exclusion = buildOffenseExclusionWhere(query.offenseType);
      if (exclusion) andClauses.push(exclusion);
      const hideExcl = query.hideFelonExclusions ?? true;
      if (hideExcl) andClauses.push({ excludesFelons: false });
    } else if (query.hideFelonExclusions) {
      andClauses.push({ excludesFelons: false });
    }

    const where: Prisma.JobWhereInput = { AND: andClauses };
    const limit  = query.limit  ?? 20;
    const offset = query.offset ?? 0;

    const [rows, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: { source: { select: { code: true, displayName: true } } },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      results: rows.map((r) => ({
        ...r,
        sourceCode: r.source.code,
        sourceName: r.source.displayName,
      })),
    };
  }

  /**
   * Bulk lookup by id — used by the saved / recently-viewed / compare views
   * so they can load a small set of jobs in one round-trip. Returns rows in
   * the same order as `ids` (missing ids are dropped).
   */
  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.job.findMany({
      where: { id: { in: ids } },
      include: { source: { select: { code: true, displayName: true } } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((j): j is (typeof rows)[number] => !!j)
      .map(this.withSource);
  }

  async findById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { source: { select: { code: true, displayName: true } } },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return {
      ...job,
      sourceCode: job.source.code,
      sourceName: job.source.displayName,
    };
  }

  /**
   * Find other active jobs that look similar to this one. The heuristic is
   * deliberately simple: prefer same industry + same region, then relax to
   * just industry. Fast, indexable, no ML. Enough to be useful on the
   * detail page without adding a recommendation service.
   */
  async findSimilar(id: string, limit = 4) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      select: { id: true, industry: true, locationRegion: true },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    const base: Prisma.JobWhereInput = {
      id: { not: job.id },
      status: 'ACTIVE',
    };

    // Tier 1 — same industry + same region.
    if (job.industry && job.locationRegion) {
      const tier1 = await this.prisma.job.findMany({
        where: { ...base, industry: job.industry, locationRegion: job.locationRegion },
        orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: { source: { select: { code: true, displayName: true } } },
      });
      if (tier1.length >= limit) {
        return tier1.map(this.withSource);
      }
      // Tier 2 — same industry, anywhere; fill the gap.
      const need = limit - tier1.length;
      const tier2 = await this.prisma.job.findMany({
        where: {
          ...base,
          industry: job.industry,
          id: { notIn: [job.id, ...tier1.map((j) => j.id)] },
        },
        orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
        take: need,
        include: { source: { select: { code: true, displayName: true } } },
      });
      return [...tier1, ...tier2].map(this.withSource);
    }

    // No industry → just recent active jobs minus self.
    const fallback = await this.prisma.job.findMany({
      where: base,
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: { source: { select: { code: true, displayName: true } } },
    });
    return fallback.map(this.withSource);
  }

  private withSource = <T extends { source: { code: string; displayName: string } }>(row: T) => ({
    ...row,
    sourceCode: row.source.code,
    sourceName: row.source.displayName,
  });
}
