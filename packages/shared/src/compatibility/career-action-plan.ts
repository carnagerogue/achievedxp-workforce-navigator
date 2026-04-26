/**
 * Career Action Plan — assembles a printable 30/60/90-day pathway from
 * the user's profile, the top match results, and identified training
 * gaps. Pure data: the print view in apps/web renders the result.
 */
import type { CompatibilityRating, JobInput, CandidateProfile } from './types';
import { TrainingBridge, TrainingBridgeStep } from './training-bridge';
import type { UserContextMode } from './user-context';

export interface PlanJobReference {
  id: string;
  title: string;
  company: string;
  city: string | null;
  region: string | null;
  matchLabel: 'Strong Match' | 'Possible Match' | 'Challenging Match';
  score: number;
  reason: string;
  mainBarrier?: string;
  recommendedNextStep: string;
}

export interface PlanPhase {
  label: '30-day' | '60-day' | '90-day';
  /** Imperative bullet points. Each rendered as a checkbox in the print view. */
  actions: string[];
}

export interface CareerActionPlan {
  generatedAt: string;        // ISO timestamp
  participantName: string | null;
  location: string | null;
  contextMode: UserContextMode | null;
  careerGoal: string | null;
  topJobs: PlanJobReference[];
  trainingSteps: TrainingBridgeStep[];
  localResourcesNote: string;
  phases: PlanPhase[];
  caseworkerNotes: string;
}

export interface BuildPlanInput {
  candidate: CandidateProfile;
  participantName?: string | null;
  location?: string | null;
  contextMode?: UserContextMode | null;
  careerGoal?: string | null;
  /**
   * Already-scored top matches (Strong + Possible). Caller is responsible
   * for fetching these from /matches or /jobs and running the
   * compatibility engine.
   */
  topMatches: Array<{ job: JobInput; rating: CompatibilityRating }>;
  /** Aggregated training steps across the top matches — caller dedupes upstream. */
  trainingSteps: TrainingBridgeStep[];
  caseworkerNotes?: string;
}

export function buildCareerActionPlan(input: BuildPlanInput): CareerActionPlan {
  const top = input.topMatches.slice(0, 3).map(({ job, rating }) => ({
    id: job.id,
    title: job.title,
    company: job.company ?? '',
    city: job.locationCity ?? null,
    region: job.locationRegion ?? null,
    matchLabel: rating.label,
    score: rating.score,
    reason: rating.summary,
    mainBarrier: rating.possibleBarriers[0] ?? rating.riskFactors[0],
    recommendedNextStep: rating.recommendedNextStep,
  }));

  const phases = buildPhases({
    contextMode: input.contextMode ?? 'in_the_community',
    trainingSteps: input.trainingSteps,
    topMatchesCount: top.length,
  });

  return {
    generatedAt: new Date().toISOString(),
    participantName: input.participantName ?? null,
    location: input.location ?? null,
    contextMode: input.contextMode ?? null,
    careerGoal: input.careerGoal ?? null,
    topJobs: top,
    trainingSteps: input.trainingSteps,
    localResourcesNote:
      'Visit the Local Help page for nearby American Job Centers, reentry programs, and apprenticeship offices. Caseworkers can confirm specific contacts before sharing this plan.',
    phases,
    caseworkerNotes: input.caseworkerNotes ?? '',
  };
}

// ────────────────────────────────────────────────────────────────────
// Phase generator — varies by context
// ────────────────────────────────────────────────────────────────────

function buildPhases(args: {
  contextMode: UserContextMode;
  trainingSteps: TrainingBridgeStep[];
  topMatchesCount: number;
}): PlanPhase[] {
  const { contextMode, trainingSteps, topMatchesCount } = args;
  const certs = trainingSteps.filter((s) => s.kind === 'certification' || s.kind === 'license');
  const docs = trainingSteps.filter((s) => s.kind === 'document' || s.kind === 'application');

  const day30: string[] = [];
  const day60: string[] = [];
  const day90: string[] = [];

  // Common day-30 actions, varied by context.
  if (contextMode === 'currently_incarcerated') {
    day30.push('Complete or update your resume with the in-facility career counselor.');
    day30.push('Identify your release area and the closest American Job Center.');
    if (certs[0]) day30.push(`Begin in-facility training: ${certs[0].title}.`);
    day30.push('Review this plan with your case manager.');
  } else if (contextMode === 'preparing_for_release') {
    day30.push(`Apply to ${Math.min(5, topMatchesCount)} Strong Match jobs in your release area.`);
    if (certs[0]) day30.push(`Start ${certs[0].title}.`);
    day30.push('Gather identity documents (state ID, social security card, birth certificate).');
    day30.push('Schedule an intake at an American Job Center near release.');
  } else if (contextMode === 'recently_released') {
    day30.push(`Apply to ${Math.min(5, topMatchesCount)} Strong Match jobs this week.`);
    day30.push('Visit a local American Job Center for free job-search assistance.');
    if (docs[0]) day30.push(docs[0].title);
    if (certs[0]) day30.push(`Start ${certs[0].title}.`);
  } else if (contextMode === 'on_supervision') {
    day30.push('Confirm with your supervising officer which industries / hours / travel are permitted.');
    day30.push(`Apply to ${Math.min(5, topMatchesCount)} Strong Match jobs that match supervision conditions.`);
    if (certs[0]) day30.push(`Start ${certs[0].title} (verify the program is supervision-friendly).`);
  } else {
    // in_the_community
    day30.push(`Apply to ${Math.min(5, topMatchesCount)} Strong Match jobs.`);
    if (certs[0]) day30.push(`Start ${certs[0].title}.`);
    day30.push('Refresh resume with any new credentials or experience.');
  }

  // Day-60 actions
  if (certs[0]) day60.push(`Complete ${certs[0].title}.`);
  if (certs[1]) day60.push(`Begin ${certs[1].title}.`);
  day60.push('Apply to additional Possible Match roles after credential is in hand.');
  day60.push('Attend at least one local hiring event or workforce-board orientation.');
  day60.push('Practice interview answers, including a brief background explanation.');

  // Day-90 actions
  if (certs[1]) day90.push(`Complete ${certs[1].title}.`);
  day90.push('Target apprenticeships or higher-wage roles that the new credentials unlock.');
  day90.push('Review progress with your caseworker; update this plan if circumstances change.');
  day90.push('Document new work history (start dates, supervisor names) for future applications.');

  return [
    { label: '30-day', actions: dedup(day30) },
    { label: '60-day', actions: dedup(day60) },
    { label: '90-day', actions: dedup(day90) },
  ];
}

function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((a) => {
    if (seen.has(a)) return false;
    seen.add(a);
    return true;
  });
}
