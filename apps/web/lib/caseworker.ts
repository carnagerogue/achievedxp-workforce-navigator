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
  priorititiesFor,
  buildTrainingBridge,
  type JobDto,
  type CandidateProfile,
  type SupervisionStatus,
  type TrainingBridgeStep,
} from '@dxp/shared';
import { inferDomain } from './realistic-fit';
import { scoreJobUnified, type UnifiedScore } from './job-scoring';
import { COMMUNITY_RESOURCES, type CommunityResource } from './community-resources';
import type { Participant, Barrier, TaskCategory } from './caseworker-store';
import type { StoredProfile } from './profile-store';

// Re-export so existing importers keep working.
export { isExclusionaryEmployer } from './job-scoring';

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

export type MatchChance = 'high' | 'medium' | 'low';
const CW_LABEL: Record<MatchChance, string> = { high: 'Strong match', medium: 'Worth a look', low: 'Likely barrier' };

export interface ScoredCaseJob {
  job: JobDto;
  score: number;
  chance: MatchChance;
  label: string;
  why: string;
  flags: string[];
  unified: UnifiedScore;
}

export function scoreJobsForParticipant(p: Participant, jobs: JobDto[]): ScoredCaseJob[] {
  const inputs = {
    candidates: [participantToCandidate(p)],
    profile: participantToProfile(p),
    convictionTypes: [p.conviction as string],
    hasConvictions: true,
  };
  return jobs
    .map((j) => {
      const u = scoreJobUnified(inputs, j);
      return { job: j, score: u.score, chance: u.chance, label: CW_LABEL[u.chance], why: u.explanation, flags: u.flags, unified: u };
    })
    .sort((a, b) => b.score - a.score);
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

// ── Training-gap aggregation ──────────────────────────────────────────────
// De-duplicates the credential steps across a participant's top matches so the
// command center can count gaps and the workspace can render + add them as
// tasks. Extracted from the old single-page useMemo so both surfaces share it.

export function aggregateTrainingSteps(p: Participant, topJobs: JobDto[]): TrainingBridgeStep[] {
  const map = new Map<string, TrainingBridgeStep>();
  for (const job of topJobs) {
    const bridge = buildTrainingBridge(
      {
        convictionType: p.conviction,
        certifications: p.certifications,
        desiredIndustries: participantDesiredIndustries(p),
      },
      {
        id: job.id, title: job.title, company: job.company, description: job.description,
        industry: job.industry, riskTier: job.riskTier,
        requiredSkills: job.requiredSkills, requiredCertifications: job.requiredCertifications,
      },
    );
    for (const s of bridge.steps) if (!map.has(s.id)) map.set(s.id, s);
  }
  return Array.from(map.values());
}

/** Map a training step's kind onto the task-engine category vocabulary. */
export function trainingStepCategory(step: TrainingBridgeStep): TaskCategory {
  switch (step.kind) {
    case 'license':
    case 'certification':
    case 'training':
      return 'training';
    case 'application':
      return 'application';
    default:
      return 'other';
  }
}
