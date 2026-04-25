import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// `zipcodes` is a CommonJS package without bundled .d.ts. We declare a
// minimal shape locally so the rest of the service stays fully typed.
export interface ZipRecord {
  zip: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  country: string;
}
interface ZipcodesModule {
  lookup(zip: string): ZipRecord | undefined;
  lookupByName(city: string, state: string): ZipRecord[] | undefined;
  radius(zip: string, miles: number): string[];
  distance(a: string, b: string): number | undefined;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const zipcodes: ZipcodesModule = require('zipcodes');

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** ZIP → { city, state, lat, lng } if known. */
  lookup(zip: string | null | undefined): ZipRecord | null {
    if (!zip) return null;
    const code = String(zip).trim();
    if (!/^\d{5}/.test(code)) return null;
    return (zipcodes.lookup(code.slice(0, 5)) ?? null) as ZipRecord | null;
  }

  /**
   * Cities (de-duplicated city+state pairs) within `miles` of the given ZIP.
   *
   * Why cities, not ZIPs: real-job providers (USAJobs, Adzuna) tag postings
   * with city + state, NOT ZIP. So ZIP-IN filters never match anything in
   * the canonical jobs table. Expanding to a city set lets us filter
   * `WHERE (locationCity, locationRegion) IN (...)` against the jobs we
   * actually have.
   */
  citiesWithinRadius(centerZip: string, miles: number): Array<{ city: string; state: string }> {
    if (!this.lookup(centerZip)) return [];
    const zips: string[] = zipcodes.radius(centerZip, miles) ?? [];
    const seen = new Set<string>();
    const out: Array<{ city: string; state: string }> = [];
    for (const z of zips) {
      const rec = zipcodes.lookup(z) as ZipRecord | undefined;
      if (!rec || !rec.city || !rec.state) continue;
      const key = `${rec.city.toLowerCase()}|${rec.state}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ city: rec.city, state: rec.state });
    }
    return out;
  }

  /**
   * Legacy ZIP-only radius (kept for any caller that still wants raw ZIPs,
   * e.g. matching against jobs with `locationPostalCode` populated).
   */
  zipsWithinRadius(centerZip: string, miles: number): string[] {
    if (!this.lookup(centerZip)) return [];
    return zipcodes.radius(centerZip, miles) ?? [];
  }

  /** Haversine distance in miles between two ZIPs. */
  distanceMiles(zipA: string, zipB: string): number | null {
    return zipcodes.distance(zipA, zipB) ?? null;
  }

  /**
   * Backfill canonical job rows with a representative ZIP based on their
   * city+state. Useful after the migration that added the column; new
   * ingestion sets it directly.
   */
  async backfillJobZips(): Promise<{ updated: number; unmatched: number }> {
    const jobs = await this.prisma.job.findMany({
      where: { locationPostalCode: null, locationCity: { not: null }, locationRegion: { not: null } },
      select: { id: true, locationCity: true, locationRegion: true },
    });

    let updated = 0;
    let unmatched = 0;
    for (const job of jobs) {
      // `zipcodes.lookupByName` returns an array of ZIP records for a given
      // city + state. Take the first; we just need a representative ZIP.
      const matches = (zipcodes.lookupByName(job.locationCity!, job.locationRegion!) ?? []) as ZipRecord[];
      if (matches.length === 0) {
        unmatched++;
        continue;
      }
      await this.prisma.job.update({
        where: { id: job.id },
        data: { locationPostalCode: matches[0].zip },
      });
      updated++;
    }
    this.logger.log(`backfillJobZips: updated=${updated} unmatched=${unmatched}`);
    return { updated, unmatched };
  }
}
