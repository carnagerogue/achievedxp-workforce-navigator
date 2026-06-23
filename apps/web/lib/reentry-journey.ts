/**
 * Reentry Compass — a research-sequenced journey for the first weeks to months
 * after release. This is the "external brain" the evidence calls for: when
 * someone's capacity for self-direction is lowest, it supplies one clear next
 * step at a time, ordered by what actually keeps people alive, out of custody,
 * and on a path to stable work — then fades as they regain their footing.
 *
 * Every phase and step carries the real research it's based on (see `evidence`),
 * so the guidance is visibly grounded, not guesswork. Pure + isomorphic; state
 * lives in reentry-store.ts.
 *
 * Sequencing rationale (the spine):
 *  - Recidivism AND mortality are front-loaded — the first weeks/months are the
 *    highest-risk window (BJS recidivism; Binswanger et al., NEJM 2007). So the
 *    journey front-loads stabilization and safety.
 *  - Survival needs come before career building; ID is the keystone document
 *    (Urban Institute, "Release Planning for Successful Reentry").
 *  - Preventable supervision (technical) violations drive ~1 in 4 prison
 *    admissions — compliance support is a safety feature (CSG, "Confined & Costly").
 *  - Sustained prosocial relationships and credible-messenger mentorship are
 *    among the strongest protective factors (Urban Institute, Arches evaluation).
 *  - Get *some* income fast, then keep and upgrade the job — retention and job
 *    quality matter more than placement (CEO/MDRC; LaBriola, RSF Journal 2020).
 *  - Hope, agency, and a forward identity are causal levers of desistance
 *    (Maruna, "Making Good").
 *
 * Evidence is best-supported practice, not a guarantee; where the field is mixed
 * we kept claims modest.
 */

export type JourneyPhaseKey = 'stabilize' | 'connect' | 'earn' | 'grow';

/** Light, self-reported context for risk/responsivity tailoring (stored locally). */
export interface ReentryInputs {
  /** Whole days since release; null when not yet set. Drives the "critical window" emphasis. */
  daysSinceRelease?: number | null;
  onSupervision?: boolean;
  /** Life-safety: lowered tolerance after time inside raises overdose risk. */
  opioidHistory?: boolean;
  /** Provider-pressure: returning to people who depend on them. */
  hasDependents?: boolean;
  needsId?: boolean;
  housingSecure?: boolean;
}

export type JourneyActionKind = 'route' | 'tel' | 'section';
export interface JourneyAction { label: string; href: string; kind: JourneyActionKind }

export interface JourneyStep {
  id: string;
  title: string;        // action-first, plain language (~6th-grade)
  why: string;          // one plain-language sentence on why it matters
  evidence: string;     // real source, attributable in-app
  action?: JourneyAction;
  /** Show only when this predicate holds for the user's inputs. */
  appliesIf?: (i: ReentryInputs) => boolean;
  /** Surfaced with urgency styling — life-safety or imminent-violation risk. */
  urgent?: boolean;
}

export interface JourneyPhase {
  key: JourneyPhaseKey;
  title: string;
  tagline: string;
  why: string;
  evidence: string;
  steps: JourneyStep[];
}

const route = (label: string, href: string): JourneyAction => ({ label, href, kind: 'route' });
const tel = (label: string, href: string): JourneyAction => ({ label, href, kind: 'tel' });
const section = (label: string, href: string): JourneyAction => ({ label, href, kind: 'section' });

export const PHASES: JourneyPhase[] = [
  {
    key: 'stabilize',
    title: 'Get steady',
    tagline: 'First, lock in the basics that keep you safe.',
    why: 'The first weeks after release are the highest-risk time — for going back, and even for your health. Getting the basics in place first makes everything after it possible.',
    evidence: 'BJS: over half of people rearrested within 5 years are arrested in the first year. Binswanger et al., NEJM 2007: highest risk of death in the first 2 weeks.',
    steps: [
      {
        id: 'safety-overdose',
        title: 'Protect your health right now',
        why: 'After time inside your tolerance is lower, so the first weeks carry the highest overdose risk. Know where to get naloxone and keep any medication going.',
        evidence: 'Binswanger et al., NEJM 2007 (overdose is the leading cause of early post-release death).',
        action: tel('Call SAMHSA — free, 24/7', 'tel:18006624357'),
        appliesIf: (i) => !!i.opioidHistory,
        urgent: true,
      },
      {
        id: 'meds',
        title: 'Don’t run out of your medication',
        why: 'About half of people lose their prescriptions after release. Book a clinic visit before your release supply runs out.',
        evidence: 'JAMA Network Open, 2025 (medication continuity after release).',
        action: route('Find a clinic near you', '/resources?need=health'),
      },
      {
        id: 'id',
        title: 'Get your ID and key documents',
        why: 'A state ID unlocks almost everything — a job, housing, benefits, a bank account. Birth certificate and Social Security card take weeks, so start now.',
        evidence: 'Urban Institute, "Release Planning for Successful Reentry" (ID is the keystone document).',
        action: route('Get ID help', '/local-help'),
        urgent: true,
      },
      {
        id: 'housing',
        title: 'Have a safe place to sleep',
        why: 'Stable housing comes before a stable job. If tonight is uncertain, find shelter or transitional housing now.',
        evidence: 'Urban Institute; Metraux & Culhane (half of shelter entries happen within 30 days of release).',
        action: route('Find housing help', '/resources?need=housing'),
        appliesIf: (i) => i.housingSecure !== true,
      },
      {
        id: 'food-cash',
        title: 'Cover food and cash this week',
        why: 'You may leave with almost nothing. Food assistance (SNAP), food banks, and emergency cash come first.',
        evidence: 'Prison Policy Initiative (gate money); CBPP (SNAP).',
        action: route('Find food & money help', '/resources?need=food'),
      },
      {
        id: 'transport',
        title: 'Set up a way to get around',
        why: 'You need a reliable way to reach check-ins, appointments, and work.',
        evidence: 'Urban Institute (transportation is one of the 8 fundamental reentry needs).',
        action: route('Find transportation help', '/local-help'),
      },
      {
        id: 'supervision',
        title: 'Put every supervision date in',
        why: 'Missing a check-in is one of the most common reasons people go back — even with no new crime. Add your dates and turn on reminders.',
        evidence: 'Council of State Governments, "Confined & Costly": technical violations are ~1 in 4 state prison admissions. SMS reminders cut missed appointments ~25–30% (ideas42 / J-PAL).',
        action: route('Set up reminders', '/local-help'),
        appliesIf: (i) => i.onSupervision !== false,
        urgent: true,
      },
    ],
  },
  {
    key: 'connect',
    title: 'You’re not alone',
    tagline: 'Build the people around you — it matters more than almost anything.',
    why: 'Strong, positive relationships are one of the biggest things that help people succeed, and isolation makes everything harder. Even one or two people in your corner change the odds.',
    evidence: 'Urban Institute, Arches mentoring evaluation (69% fewer reconvictions at 1 year). Vera Institute on isolation. Maruna, "Making Good."',
    steps: [
      {
        id: 'corner',
        title: 'Name who’s in your corner',
        why: 'Even one or two positive people make a real difference. Add them here and keep in touch.',
        evidence: 'Urban Institute; desistance research (Maruna) — prosocial relationships protect against returning.',
        action: section('Build your corner', '#corner'),
      },
      {
        id: 'mentor',
        title: 'Find someone who’s been there',
        why: 'Mentors with lived experience — "credible messengers" — have some of the strongest results in all of reentry.',
        evidence: 'Urban Institute, Arches Transformative Mentoring (large recidivism reductions).',
        action: route('Find a reentry program', '/local-help'),
      },
      {
        id: 'talk',
        title: 'Have someone to talk to on a hard day',
        why: 'Reaching out is strength. Free, confidential help is one tap away, any time.',
        evidence: 'SAMHSA (warm handoff to real support reduces crisis). 988 Suicide & Crisis Lifeline.',
        action: tel('Call or text 988', 'tel:988'),
      },
    ],
  },
  {
    key: 'earn',
    title: 'Get income coming in',
    tagline: 'Get some money coming in soon — in work that lasts.',
    why: 'A first paycheck eases the pressure that pulls people backward. Aim for stable, fair-chance work — getting income soon, then keeping it, helps most.',
    evidence: 'Center for Employment Opportunities / MDRC (rapid work for the recently released reduced recidivism). LaBriola, RSF Journal 2020 (job quality matters).',
    steps: [
      {
        id: 'child-support',
        title: 'Get a handle on what you owe',
        why: 'If you owe child support, payments can often be lowered to what you can actually afford. A realistic plan helps your family more than debt that can’t be paid.',
        evidence: 'National Institute of Justice, "Child Support and Reentry" (unpayable arrears raise re-offense risk).',
        action: route('Find legal & money help', '/resources?need=family'),
        appliesIf: (i) => !!i.hasDependents,
      },
      {
        id: 'first-job',
        title: 'Find work that hires people with records',
        why: 'Aim for stable sectors — warehousing, manufacturing, trades — that hire fair-chance, instead of churn-y temp work.',
        evidence: 'LaBriola, RSF Journal 2020 (stable, higher-quality jobs lower re-offense; temp work does not).',
        action: route('See your matches', '/jobs'),
      },
      {
        id: 'employer-case',
        title: 'Show employers why hiring you is low-risk',
        why: 'Two federal programs lower an employer’s risk: the Work Opportunity Tax Credit and free Federal Bonding. Bring them up.',
        evidence: 'U.S. DOL Federal Bonding Program; IRS Work Opportunity Tax Credit.',
        action: route('Prepare your story', '/background-statement'),
      },
      {
        id: 'apprenticeship',
        title: 'Earn while you learn',
        why: 'Apprenticeships pay from day one and many welcome people with records — a paid path into the trades.',
        evidence: 'RAND correctional-education meta-analysis; Urban Institute (apprenticeship in reentry).',
        action: route('Browse apprenticeships', '/apprenticeships'),
      },
    ],
  },
  {
    key: 'grow',
    title: 'Keep it and build',
    tagline: 'The real win is keeping the job and moving up.',
    why: 'The first job isn’t the finish line. Staying past the hard first months and raising your wage over time is what changes your path for good.',
    evidence: 'MDRC (placement alone fades without retention support). Bunting et al. 2019 (stability beats job-hopping). Schnepel 2017 (higher wages lower re-offense).',
    steps: [
      {
        id: 'retention',
        title: 'Make it through the first 90 days',
        why: 'The first months on a job are the hardest. Plan for rough days before they happen, and ask for help early.',
        evidence: 'Bunting et al. 2019 (job stability lowers recidivism; job-hopping raises it).',
        action: route('Track your plan', '/local-help'),
      },
      {
        id: 'readiness',
        title: 'Close the gaps that hold you back',
        why: 'See where you stand across housing, ID, skills, and more — then work the plan, one area at a time.',
        evidence: 'Risk-Need-Responsivity model (Andrews & Bonta) — focus effort on the changeable needs that drive outcomes.',
        action: route('Open My Plan', '/local-help'),
      },
      {
        id: 'future-self',
        title: 'Picture who you’re becoming',
        why: 'People who can see a positive future for themselves are far more likely to reach it. Name the goal you’re working toward.',
        evidence: 'Maruna, "Making Good" (a forward identity and hope drive lasting change).',
        action: section('Set your goal', '#future-self'),
      },
      {
        id: 'upgrade',
        title: 'Raise your income over time',
        why: 'Once you’re steady, a better-paying role or a credential changes everything for you and the people counting on you.',
        evidence: 'Schnepel 2017 (wages and recidivism); RAND education meta-analysis (43% lower odds of return).',
        action: route('Find a step up', '/apprenticeships'),
      },
    ],
  },
];

/** Steps in a phase that apply to this user (after responsivity gating). */
export function applicableSteps(phase: JourneyPhase, inputs: ReentryInputs): JourneyStep[] {
  return phase.steps.filter((s) => (s.appliesIf ? s.appliesIf(inputs) : true));
}

export interface PhaseProgress { phase: JourneyPhase; total: number; done: number; complete: boolean; steps: JourneyStep[] }

export function phaseProgress(inputs: ReentryInputs, completed: Set<string>): PhaseProgress[] {
  return PHASES.map((phase) => {
    const steps = applicableSteps(phase, inputs);
    const done = steps.filter((s) => completed.has(s.id)).length;
    return { phase, steps, total: steps.length, done, complete: steps.length > 0 && done === steps.length };
  });
}

/** The active phase = the first phase that still has applicable, incomplete steps. */
export function activePhaseKey(inputs: ReentryInputs, completed: Set<string>): JourneyPhaseKey {
  const prog = phaseProgress(inputs, completed);
  return (prog.find((p) => !p.complete)?.phase.key) ?? 'grow';
}

/** The single most important next step right now — the "one thing" to surface. */
export function nextStep(inputs: ReentryInputs, completed: Set<string>): { phase: JourneyPhase; step: JourneyStep } | null {
  for (const phase of PHASES) {
    for (const step of applicableSteps(phase, inputs)) {
      if (!completed.has(step.id)) return { phase, step };
    }
  }
  return null;
}

/** Overall progress across every applicable step. */
export function overallProgress(inputs: ReentryInputs, completed: Set<string>): { done: number; total: number; pct: number } {
  const all = PHASES.flatMap((p) => applicableSteps(p, inputs));
  const done = all.filter((s) => completed.has(s.id)).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

/** Are we in the front-loaded critical window the evidence says to prioritize? */
export function inCriticalWindow(inputs: ReentryInputs): boolean {
  return inputs.daysSinceRelease != null && inputs.daysSinceRelease >= 0 && inputs.daysSinceRelease <= 180;
}

/** Sources behind the design, for the "why we built it this way" panel. */
export const EVIDENCE_BASE: { claim: string; source: string }[] = [
  { claim: 'Recidivism is front-loaded — the first months are highest-risk, so support is too.', source: 'Bureau of Justice Statistics, Recidivism of Prisoners Released in 30 States (Durose et al., 2014).' },
  { claim: 'The first two weeks carry the highest risk of death, especially overdose.', source: 'Binswanger et al., New England Journal of Medicine, 2007.' },
  { claim: 'Preventable technical violations drive ~1 in 4 state prison admissions; reminders help.', source: 'Council of State Governments, "Confined & Costly" (2019); ideas42 / J-PAL SMS reminder trials.' },
  { claim: 'Mentorship from people with lived experience strongly reduces reconviction.', source: 'Urban Institute, evaluation of Arches Transformative Mentoring.' },
  { claim: 'Cognitive-behavioral approaches reduce recidivism by roughly a quarter.', source: 'Landenberger & Lipsey, Journal of Experimental Criminology, 2005.' },
  { claim: 'Keeping a quality job matters more than just getting one.', source: 'Center for Employment Opportunities / MDRC; LaBriola, RSF Journal, 2020.' },
  { claim: 'Hope, agency, and a forward identity drive lasting change.', source: 'Maruna, "Making Good" (2001); LeBel et al., 2008.' },
  { claim: 'Match support to need; guide one clear step at a time for a stressed, just-released person.', source: 'Andrews & Bonta (Risk-Need-Responsivity); Haney, "The Psychological Impact of Incarceration" (2001).' },
];
