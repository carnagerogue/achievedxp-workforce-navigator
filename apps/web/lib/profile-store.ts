/**
 * In-memory profile store for the in-app mock backend.
 *
 * The deployed web service runs without the NestJS API + Postgres, so the
 * `/api/v1/*` route handlers fall back to this module the same way the
 * assessment results do (an in-process Map). It persists for the lifetime
 * of the server instance — long enough for a demo session — and resets on
 * redeploy. When NEXT_PUBLIC_API_URL points at a real backend, none of this
 * is used.
 *
 * The important job here is translating the onboarding payload into the
 * `CandidateProfile` shape the @dxp/shared compatibility engine consumes,
 * so the dashboard / matches / insights become genuinely conviction-aware
 * instead of returning the same demo distribution for everyone.
 */
import type { CandidateProfile, SupervisionStatus } from '@dxp/shared';
import { convictionForOffenseType } from '@dxp/shared';

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
  onParoleOrProbation?: boolean;
  restrictedIndustries?: string[];
  skills?: string[];
  certifications?: string[];
  desiredIndustries?: string[];
  convictions?: StoredConviction[];
}

/**
 * Pin the Map to globalThis so it's a true singleton across every API route
 * handler. Next bundles route handlers separately (especially in dev), so a
 * plain module-level `const` can yield a different Map per route — which would
 * make the profile written by POST /profile invisible to GET /matches. The
 * global-singleton pattern is the same one used for the Prisma client.
 */
const globalForProfiles = globalThis as unknown as { __dxpProfiles?: Map<string, StoredProfile> };
const PROFILES: Map<string, StoredProfile> = globalForProfiles.__dxpProfiles ?? new Map();
globalForProfiles.__dxpProfiles = PROFILES;

export function saveProfile(profile: StoredProfile): StoredProfile {
  PROFILES.set(profile.userId, profile);
  return profile;
}

export function getProfile(userId: string): StoredProfile | null {
  return PROFILES.get(userId) ?? null;
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
