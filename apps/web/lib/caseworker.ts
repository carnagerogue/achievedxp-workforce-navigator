/**
 * Caseworker engine — realistic, fair-chance-aware scoring and planning for a
 * participant. Builds on the same primitives the dashboard uses (conviction
 * compatibility + realistic fit + offense hard-filters) and adds:
 *   - federal / security-clearance employer detection, so military-base and
 *     federal-suitability postings stop surfacing as "Strong Match · Apply now"
 *   - barrier → local-resource mapping
 *   - context-aware (pre-release vs on-supervision vs in-community) guidance
 */
import {
  scoreJobCompatibility,
  isOffenseHardBlocked,
  priorititiesFor,
  type JobDto,
  type JobInput,
  type CandidateProfile,
  type CompatibilityRating,
  type SupervisionStatus,
} from '@dxp/shared';
import { realisticFit, inferDomain, type RealisticFit } from './realistic-fit';
import { COMMUNITY_RESOURCES, type CommunityResource } from './community-resources';
import type { Participant, Barrier } from './caseworker-store';
import type { StoredProfile } from './profile-store';

// ── Federal / security-clearance employer detection ──────────────────────
// Ported from the API classifier. These employers run federal-suitability or
// clearance checks that are typically disqualifying for justice-impacted
// applicants — recommending them as "apply now" wastes a participant's time.
const EXCLUSIONARY_EMPLOYER = new RegExp(
  [
    '\\bU\\.?\\s?S\\.?\\s?(Army|Navy|Air Force|Marines?|Coast Guard|Marshals?)\\b',
    '\\bArmy (National Guard|Reserve)\\b', '\\bNational Guard\\b',
    '\\bNaval (Air|Sea|Surface|Special|Information|Installations|Education|Station|Base)\\b',
    '\\bMarine Corps\\b', '\\bSpace Force\\b', '\\bAir Force\\b',
    '\\bDepartment of Defense\\b', '\\bDefense (Logistics|Commissary|Finance|Information|Intelligence)\\b',
    '\\bPentagon\\b', '\\bBureau of Prisons\\b', '\\bFederal (Prison|Penitentiary|Correctional|Bureau of Investigation|Protective Service)\\b',
    '\\bSecret Service\\b', '\\bFBI\\b', '\\bDrug Enforcement\\b', '\\bCustoms and Border\\b', '\\bBorder Patrol\\b',
    '\\bImmigration and Customs\\b', '\\bTransportation Security Administration\\b', '\\bTSA\\b',
    '\\bCentral Intelligence\\b', '\\bNational Security Agency\\b', '\\bCommander,',
    '\\bsecurity clearance\\b', '\\btop[\\s-]secret\\b', '\\bsecret clearance\\b', '\\bpolice officer\\b',
    '\\bcorrectional? officer\\b', '\\bdeputy (sheriff|marshal)\\b',
  ].join('|'),
  'i',
);

export function isExclusionaryEmployer(job: { company?: string | null; title?: string | null; description?: string | null }): boolean {
  return EXCLUSIONARY_EMPLOYER.test(`${job.company ?? ''} ${job.title ?? ''} ${job.description ?? ''}`);
}

// ── Participant → engine inputs ──────────────────────────────────────────
function thisYear(): number { return new Date().getFullYear(); }

function supervisionStatus(p: Participant): SupervisionStatus {
  if (p.contextMode === 'currently_incarcerated') return 'incarcerated';
  switch (p.supervision) {
    case 'parole': return 'parole';
    case 'probation': return 'probation';
    case 'parole_and_probation': return 'parole_and_probation';
    default: return 'none';
  }
}

export function participantDesiredIndustries(p: Participant): string[] {
  const d = p.careerGoal ? inferDomain(p.careerGoal) : null;
  return d ? [d] : [];
}

function participantToCandidate(p: Participant): CandidateProfile {
  return {
    convictionType: p.conviction,
    releaseDate: p.yearsSinceRelease != null ? thisYear() - p.yearsSinceRelease : null,
    supervisionStatus: supervisionStatus(p),
    certifications: p.certifications,
    educationLevel: p.education,
    transportationAccess: !p.barriers.includes('transportation'),
    desiredIndustries: participantDesiredIndustries(p),
  };
}

function participantToProfile(p: Participant): StoredProfile {
  return {
    userId: p.id,
    skills: [...p.skills, ...(p.careerGoal ? p.careerGoal.split(/[\s,]+/).filter((w) => w.length > 2) : [])],
    certifications: p.certifications,
    desiredIndustries: participantDesiredIndustries(p),
    willingToRelocate: false,
    hasTransportation: !p.barriers.includes('transportation'),
  };
}

function jobToInput(j: JobDto): JobInput {
  return {
    id: j.id, title: j.title, company: j.company, description: j.description,
    industry: j.industry, riskTier: j.riskTier, excludesFelons: j.excludesFelons,
    backgroundCheckLikely: j.backgroundCheckLikely, isApprenticeship: j.isApprenticeship,
    remote: j.remote, locationRegion: j.locationRegion, locationCity: j.locationCity,
    requiredSkills: j.requiredSkills, requiredCertifications: j.requiredCertifications,
  };
}

export type MatchChance = 'high' | 'medium' | 'low';

export interface ScoredCaseJob {
  job: JobDto;
  score: number;
  chance: MatchChance;
  label: string;
  why: string;
  flags: string[];
  rating: CompatibilityRating;
  fit: RealisticFit;
}

const LABEL: Record<MatchChance, string> = { high: 'Strong match', medium: 'Worth a look', low: 'Likely barrier' };

export function scoreJobsForParticipant(p: Participant, jobs: JobDto[]): ScoredCaseJob[] {
  const candidate = participantToCandidate(p);
  const profile = participantToProfile(p);

  return jobs.map((j) => {
    const input = jobToInput(j);
    const rating = scoreJobCompatibility(candidate, input);
    const fit = realisticFit(profile, j);
    const exclusionary = isExclusionaryEmployer(j);
    const hardBlock = isOffenseHardBlocked(p.conviction, { industry: j.industry, title: j.title });

    let score = Math.round(0.55 * rating.score + 0.45 * fit.total);
    score = Math.min(score, fit.attainabilityCap);

    const flags: string[] = [];
    if (exclusionary) { score = Math.min(score, 30); flags.push('Federal / security-clearance employer — typically disqualifies people with records.'); }
    if (j.excludesFelons) { score = Math.min(score, 25); flags.push('Posting requires a clean record.'); }
    if (hardBlock.blocked && hardBlock.reason) { score = Math.min(score, 25); flags.push(hardBlock.reason); }
    score = Math.max(0, score);

    const barred = exclusionary || j.excludesFelons || hardBlock.blocked;
    const chance: MatchChance = barred || rating.chance === 'low' || score < 40
      ? 'low'
      : score >= 70 && rating.chance === 'high' ? 'high' : 'medium';

    const positives = fit.factors.positive[0]
      ? fit.factors.positive[0][0].toUpperCase() + fit.factors.positive[0].slice(1)
      : rating.summary;
    const why = chance === 'low' && flags.length ? flags[0] : positives + (rating.chance === 'high' ? '; no legal barriers flagged.' : '.');

    return { job: j, score, chance, label: LABEL[chance], why, flags, rating, fit };
  }).sort((a, b) => b.score - a.score);
}

// ── Barriers → real local resources ──────────────────────────────────────
const BARRIER_TO_CATEGORY: Record<Barrier, { key: string; label: string }> = {
  transportation: { key: 'transit',  label: 'Transportation help' },
  housing:        { key: 'housing',  label: 'Housing & shelter' },
  food:           { key: 'food',     label: 'Food assistance' },
  recovery:       { key: 'health',   label: 'Treatment & recovery' },
  legal:          { key: 'legal',    label: 'Legal aid & record clearing' },
  childcare:      { key: 'family',   label: 'Childcare & family' },
  id_documents:   { key: 'legal',    label: 'ID & documents' },
};

export interface BarrierResource { key: string; label: string; resources: CommunityResource[] }

/** Map a participant's barriers (+ conviction-driven legal needs) to resources. */
export function barriersToResources(p: Participant): BarrierResource[] {
  const cats = new Map<string, { label: string }>();
  for (const b of p.barriers) {
    const c = BARRIER_TO_CATEGORY[b];
    if (c) cats.set(c.key, { label: c.label });
  }
  // Convictions with categorical bars almost always benefit from record-clearing help.
  if (['registry_related', 'financial_fraud', 'weapons_related', 'dui_dwi', 'violent_offense'].includes(p.conviction)) {
    if (!cats.has('legal')) cats.set('legal', { label: 'Legal aid & record clearing' });
  }
  return Array.from(cats.entries()).map(([key, { label }]) => ({
    key, label, resources: COMMUNITY_RESOURCES[key] ?? [],
  }));
}

export function contextGuidance(p: Participant): string {
  return priorititiesFor(p.contextMode).guidance;
}
