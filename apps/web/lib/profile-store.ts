/**
 * Profile store for the in-app backend under /api/v1/*.
 *
 * Reads/writes go through the storage layer's in-process memory backend
 * (lib/storage/memory) so the synchronous getProfile/saveProfile signatures
 * used across the app keep working. Durable persistence is layered on top by
 * the server-only async API in lib/storage: the profile route handler calls
 * `putDoc(PROFILE_COLLECTION, …)` (memory + Postgres when DATABASE_URL is
 * set), and server-data's match/insight pipeline reads through
 * `getDoc(PROFILE_COLLECTION, …)` (memory first, then Postgres on a miss).
 * Without DATABASE_URL everything stays in-process exactly as before —
 * state lasts for the lifetime of the server instance and resets on
 * redeploy. See docs/web-persistence.md.
 *
 * IMPORTANT: client pages import this module for its pure helpers
 * (candidateProfilesFromStored / convictionTypesFor / types), so it must
 * never import lib/storage's index or postgres modules — only the
 * client-safe memory backend. That is what keeps `pg` out of client bundles.
 *
 * The important job here is translating the onboarding payload into the
 * `CandidateProfile` shape the @dxp/shared compatibility engine consumes,
 * so the dashboard / matches / insights become genuinely conviction-aware
 * instead of returning the same demo distribution for everyone.
 */
import type { CandidateProfile, SupervisionStatus } from '@dxp/shared';
import { convictionForOffenseType } from '@dxp/shared';
import { memGetDoc, memPutDoc } from './storage/memory';

export interface StoredConviction {
  category?: 'FELONY' | 'MISDEMEANOR' | 'INFRACTION';
  offenseType?: string;
  convictionYear?: number;
  releaseYear?: number;
  currentlyIncarcerated?: boolean;
  onParole?: boolean;
  onProbation?: boolean;
  registryStatus?: boolean;
  /** @deprecated legacy alias for registryStatus */
  sexOffenderRegistry?: boolean;
}

export interface StoredProfile {
  userId: string;
  locationCity?: string;
  locationRegion?: string;
  locationPostalCode?: string;
  yearsExperience?: number;
  hasTransportation?: boolean;
  willingToRelocate?: boolean;
  hasFelonyRecord?: boolean;
  /** User explicitly opted into record-aware guidance during onboarding. */
  justiceSupportEnabled?: boolean;
  onParoleOrProbation?: boolean;
  restrictedIndustries?: string[];
  skills?: string[];
  certifications?: string[];
  desiredIndustries?: string[];
  convictions?: StoredConviction[];
}

/** Storage-layer collection that holds stored profiles (see lib/storage). */
export const PROFILE_COLLECTION = 'profiles';

/**
 * Synchronous, memory-only write. Callers that need durability (the profile
 * route handler) follow up with `putDoc(PROFILE_COLLECTION, …)` from
 * lib/storage — which writes this same memory store plus Postgres — so sync
 * readers always see the write immediately either way.
 */
export function saveProfile(profile: StoredProfile): StoredProfile {
  memPutDoc(PROFILE_COLLECTION, profile.userId, profile);
  return profile;
}

/**
 * Synchronous, memory-only read. Server code that must survive a restart
 * reads through lib/storage's `getDoc(PROFILE_COLLECTION, …)` instead, which
 * checks this same memory store first and falls back to Postgres on a miss.
 */
export function getProfile(userId: string): StoredProfile | null {
  return memGetDoc<StoredProfile>(PROFILE_COLLECTION, userId);
}

function supervisionFor(c: StoredConviction): SupervisionStatus {
  if (c.currentlyIncarcerated) return 'incarcerated';
  if (c.onParole && c.onProbation) return 'parole_and_probation';
  if (c.onParole) return 'parole';
  if (c.onProbation) return 'probation';
  return 'none';
}

/**
 * Expand a stored profile into one `CandidateProfile` per conviction.
 *
 * The compatibility engine scores a single conviction at a time. A person
 * may carry several, so callers should score a job against EACH returned
 * profile and keep the worst (lowest) result — the conservative, fair-chance
 * stance that never over-promises.
 *
 * A registry flag is honored even when the offense type isn't itself
 * registry-related: an extra `registry_related` profile is appended so the
 * registry duty-conflict rules always fire.
 *
 * Returns a single conviction-less profile when the person has no record,
 * so general fit (skills / location / industry) still drives ranking.
 */
export function candidateProfilesFromStored(profile: StoredProfile | null): CandidateProfile[] {
  const common: CandidateProfile = {
    certifications: profile?.certifications ?? [],
    desiredIndustries: profile?.desiredIndustries ?? [],
    excludedIndustries: profile?.restrictedIndustries ?? [],
    willingToRelocate: profile?.willingToRelocate ?? false,
    transportationAccess: profile?.hasTransportation ?? false,
  };

  const convictions = profile?.convictions ?? [];
  if (convictions.length === 0) {
    return [common];
  }

  const out: CandidateProfile[] = [];
  for (const c of convictions) {
    const isRegistry = Boolean(c.registryStatus || c.sexOffenderRegistry);
    out.push({
      ...common,
      convictionType: convictionForOffenseType(c.offenseType),
      convictionDate: c.convictionYear ?? null,
      releaseDate: c.releaseYear ?? null,
      supervisionStatus: supervisionFor(c),
    });
    if (isRegistry && convictionForOffenseType(c.offenseType) !== 'registry_related') {
      out.push({
        ...common,
        convictionType: 'registry_related',
        convictionDate: c.convictionYear ?? null,
        releaseDate: c.releaseYear ?? null,
        supervisionStatus: supervisionFor(c),
      });
    }
  }
  return out;
}

/** The set of distinct ConvictionTypes a profile carries (for offense hard-filters). */
export function convictionTypesFor(profile: StoredProfile | null): string[] {
  return Array.from(
    new Set(candidateProfilesFromStored(profile).map((p) => p.convictionType).filter(Boolean) as string[]),
  );
}
