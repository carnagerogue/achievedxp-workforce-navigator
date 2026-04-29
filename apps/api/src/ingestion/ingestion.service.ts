import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobStatus, RawIngestStatus } from '@prisma/client';
import { createHash } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { ClassifierService } from '../classification/classifier.service';
import { JOB_PROVIDERS, JobProvider, CanonicalJob } from './providers/job-provider.interface';
import { sanitizeHtml } from './html-sanitize';
import { AdzunaProvider, ADZUNA_STATES } from './providers/adzuna.provider';

export interface IngestSummary {
  source: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  failed: number;
}

@Injectable()
export class IngestionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly classifier: ClassifierService,
    private readonly adzuna: AdzunaProvider,
    @Inject(JOB_PROVIDERS) private readonly providers: JobProvider[],
  ) {}

  async onApplicationBootstrap() {
    const runOnBoot = String(this.config.get('INGEST_RUN_ON_BOOT') ?? 'false') === 'true';
    if (runOnBoot) {
      this.logger.log('INGEST_RUN_ON_BOOT=true → running ingestion once at startup');
      await this.runAll().catch((e) => this.logger.error('Bootstrap ingestion failed', e));
    }
  }

  // Phase 4 will move this to BullMQ; for now, nightly in-process cron is fine.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledRun() {
    this.logger.log('Scheduled ingestion run starting');
    await this.runAll();
  }

  async runAll(): Promise<IngestSummary[]> {
    const summaries: IngestSummary[] = [];
    for (const provider of this.providers) {
      if (!this.isProviderEnabled(provider.code)) continue;
      try {
        summaries.push(await this.runProvider(provider));
      } catch (err) {
        this.logger.error(`Provider "${provider.code}" failed`, err as Error);
        summaries.push({ source: provider.code, fetched: 0, inserted: 0, duplicates: 0, failed: 1 });
      }
    }
    return summaries;
  }

  /**
   * Fill gaps in state-level coverage using per-state Adzuna queries.
   * For every US state whose active-job count is below `min`, run a
   * targeted `where=<state>` query and normalize the results through the
   * same pipeline as the regular ingestion.
   *
   * Returns a summary: how many states were below the floor, how many
   * new jobs were inserted, and the post-fill per-state counts.
   */
  async fillStateCoverage(min = 10): Promise<{
    statesBelow: number;
    inserted: number;
    duplicates: number;
    failed: number;
    coverage: Array<{ state: string; before: number; after: number }>;
  }> {
    const source = await this.prisma.jobSource.findUnique({ where: { code: this.adzuna.code } });
    if (!source) throw new Error('adzuna source row missing — run seed');

    // Count active jobs per state BEFORE the fill.
    const before = await this.prisma.job.groupBy({
      by: ['locationRegion'],
      where: { status: 'ACTIVE', locationRegion: { not: null } },
      _count: { _all: true },
    });
    const beforeByState = new Map<string, number>(
      before.map((r) => [r.locationRegion as string, r._count._all]),
    );

    // Identify underfilled states (include those with zero jobs).
    const targets = ADZUNA_STATES.filter(
      (s) => (beforeByState.get(s.code) ?? 0) < min,
    );
    if (targets.length === 0) {
      return { statesBelow: 0, inserted: 0, duplicates: 0, failed: 0, coverage: [] };
    }

    this.logger.log(`fillStateCoverage: ${targets.length} state(s) under ${min} — querying Adzuna`);
    const raws = await this.adzuna.fetchForStates(targets.map((s) => s.name));

    let inserted = 0, duplicates = 0, failed = 0;
    for (const raw of raws) {
      try {
        const r = await this.ingestOne(this.adzuna, source.id, raw);
        if (r === 'inserted') inserted++;
        else if (r === 'duplicate') duplicates++;
      } catch (err) {
        failed++;
        this.logger.warn(`state-fill ingest failed: ${(err as Error).message}`);
      }
    }

    const after = await this.prisma.job.groupBy({
      by: ['locationRegion'],
      where: { status: 'ACTIVE', locationRegion: { not: null } },
      _count: { _all: true },
    });
    const afterByState = new Map<string, number>(
      after.map((r) => [r.locationRegion as string, r._count._all]),
    );

    const coverage = targets.map((s) => ({
      state: s.code,
      before: beforeByState.get(s.code) ?? 0,
      after:  afterByState.get(s.code)  ?? 0,
    }));

    await this.prisma.jobSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });

    return {
      statesBelow: targets.length,
      inserted, duplicates, failed,
      coverage,
    };
  }

  /**
   * Convention: each provider has an env flag `INGEST_<CODE>_ENABLED`
   * (e.g. INGEST_MOCK_ENABLED) OR `<CODE>_ENABLED` (e.g. USAJOBS_ENABLED).
   * Defaults to enabled if neither is set.
   */
  private isProviderEnabled(code: string): boolean {
    const upper = code.toUpperCase();
    const a = this.config.get<string>(`INGEST_${upper}_ENABLED`);
    const b = this.config.get<string>(`${upper}_ENABLED`);
    const flag = a ?? b;
    return flag === undefined ? true : String(flag).toLowerCase() === 'true';
  }

  async runProvider(provider: JobProvider): Promise<IngestSummary> {
    const source = await this.prisma.jobSource.findUnique({ where: { code: provider.code } });
    if (!source) {
      throw new Error(
        `JobSource "${provider.code}" is not registered in the DB. Run the seed script first.`,
      );
    }

    const raws = await provider.fetch();
    let inserted = 0;
    let duplicates = 0;
    let failed = 0;

    for (const raw of raws) {
      try {
        const result = await this.ingestOne(provider, source.id, raw);
        if (result === 'inserted') inserted++;
        else if (result === 'duplicate') duplicates++;
      } catch (err) {
        failed++;
        this.logger.warn(`Failed to ingest ${provider.code}:${raw.externalId} — ${(err as Error).message}`);
      }
    }

    await this.prisma.jobSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });

    const summary = { source: provider.code, fetched: raws.length, inserted, duplicates, failed };
    this.logger.log(
      `[${provider.code}] fetched=${summary.fetched} inserted=${summary.inserted} dup=${summary.duplicates} failed=${summary.failed}`,
    );
    return summary;
  }

  /**
   * Full pipeline for one posting:
   *  1. Persist raw payload (idempotent per source+externalId).
   *  2. Normalize to canonical shape.
   *  3. Compute dedup hash.
   *  4. Upsert canonical job (dedup by hash across sources).
   *  5. Link raw row → job, mark status.
   */
  private async ingestOne(
    provider: JobProvider,
    sourceId: string,
    raw: { externalId: string; payload: unknown },
  ): Promise<'inserted' | 'duplicate'> {
    // 1. raw payload — if it already exists and is NORMALIZED, skip.
    const existingRaw = await this.prisma.jobRawIngestion.findUnique({
      where: { sourceId_externalId: { sourceId, externalId: raw.externalId } },
    });
    if (existingRaw?.status === RawIngestStatus.NORMALIZED) {
      return 'duplicate';
    }

    const rawRow = existingRaw
      ? existingRaw
      : await this.prisma.jobRawIngestion.create({
          data: {
            sourceId,
            externalId: raw.externalId,
            payload: raw.payload as object,
          },
        });

    // 2 + 3. normalize & hash
    const canonical = provider.normalize(raw.payload);
    const dedupHash = this.computeDedupHash(canonical);

    // Sanitize any HTML the provider returned, *before* it lands in the DB.
    const safeHtml = sanitizeHtml(canonical.descriptionHtml);

    // Classify from canonical text — same rules for every source.
    const tags = this.classifier.classify({
      title: canonical.title,
      description: canonical.description,
      industry: canonical.industry ?? null,
      company: canonical.company ?? null,
    });

    // 4. upsert canonical job by dedup hash — same posting seen from a
    //    different source updates metadata rather than creating duplicates.
    // We pre-check for an existing canonical row so we can correctly
    // distinguish 'inserted' vs 'duplicate' AND mark the raw row's
    // status accordingly (NORMALIZED vs DUPLICATE). Without this check
    // every upsert returned 'inserted' and the dup metric was wrong.
    const existingCanonical = await this.prisma.job.findUnique({
      where: { dedupHash },
      select: { id: true, sourceId: true },
    });
    const isDuplicateOfOtherSource =
      !!existingCanonical && existingCanonical.sourceId !== sourceId;

    const job = await this.prisma.job.upsert({
      where: { dedupHash },
      create: {
        sourceId,
        externalId: canonical.externalId,
        dedupHash,
        title:                  canonical.title,
        company:                canonical.company,
        description:            canonical.description,
        descriptionHtml:        safeHtml,
        applyUrl:               canonical.applyUrl,
        locationCity:           canonical.locationCity ?? null,
        locationRegion:         canonical.locationRegion ?? null,
        locationPostalCode:     canonical.locationPostalCode ?? null,
        locationCountry:        canonical.locationCountry ?? null,
        remote:                 canonical.remote ?? false,
        employmentType:         canonical.employmentType ?? 'FULL_TIME',
        industry:               tags.industry,
        salaryMin:              canonical.salaryMin ?? null,
        salaryMax:              canonical.salaryMax ?? null,
        salaryCurrency:         canonical.salaryCurrency ?? 'USD',
        requiredSkills:         canonical.requiredSkills ?? [],
        requiredCertifications: canonical.requiredCertifications ?? [],
        minYearsExperience:     canonical.minYearsExperience ?? null,
        riskTier:               tags.riskTier,
        backgroundCheckLikely:  tags.backgroundCheckLikely,
        excludesFelons:         tags.excludesFelons,
        isApprenticeship:       tags.isApprenticeship,
        status:                 JobStatus.ACTIVE,
        postedAt:               canonical.postedAt ?? null,
        expiresAt:              canonical.expiresAt ?? null,
      },
      update: {
        // keep freshest fields; primary source wins on title/description conflicts
        description:           canonical.description,
        descriptionHtml:       safeHtml,
        applyUrl:              canonical.applyUrl,
        salaryMin:             canonical.salaryMin ?? undefined,
        salaryMax:             canonical.salaryMax ?? undefined,
        postedAt:              canonical.postedAt ?? undefined,
        expiresAt:             canonical.expiresAt ?? undefined,
        industry:              tags.industry ?? undefined,
        locationPostalCode:    canonical.locationPostalCode ?? undefined,
        riskTier:              tags.riskTier,
        backgroundCheckLikely: tags.backgroundCheckLikely,
        excludesFelons:        tags.excludesFelons,
        isApprenticeship:      tags.isApprenticeship,
        status:                JobStatus.ACTIVE,
      },
    });

    // 5. link raw → canonical. If this raw row corresponds to a posting
    //    that was already ingested from a *different* source (cross-source
    //    duplicate), record DUPLICATE on the raw row but still link
    //    `normalizedJobId` to the existing canonical job so downstream
    //    audits can trace which sources surfaced the same posting.
    await this.prisma.jobRawIngestion.update({
      where: { id: rawRow.id },
      data: {
        status: isDuplicateOfOtherSource
          ? RawIngestStatus.DUPLICATE
          : RawIngestStatus.NORMALIZED,
        normalizedJobId: job.id,
      },
    });

    return existingCanonical ? 'duplicate' : 'inserted';
  }

  /**
   * Dedup hash across sources: employer + title + region + external id.
   * Including externalId keeps collisions from distinct real postings that
   * happen to share a title/employer/region; removing it would cause false
   * merges. Phase 4 will add fuzzy title matching on top of this.
   */
  private computeDedupHash(c: CanonicalJob): string {
    const parts = [
      c.company?.trim().toLowerCase() ?? '',
      c.title?.trim().toLowerCase() ?? '',
      c.locationRegion?.trim().toLowerCase() ?? '',
      c.externalId,
    ];
    return createHash('sha256').update(parts.join('|')).digest('hex');
  }
}
