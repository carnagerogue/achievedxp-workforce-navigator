/**
 * Navigator journey — a universal, research-informed workforce path.
 *
 * Everyone sees the same four broad stages: choose a direction, build a plan,
 * prepare, and find work. More specialized support is added only when a person
 * explicitly asks for it. In particular, identity-document, supervision, and
 * record-aware guidance are never inferred from simply using the product.
 *
 * The legacy module name is retained so existing browser-local progress remains
 * compatible while the user-facing experience is inclusive.
 */

export type JourneyPhaseKey = 'stabilize' | 'connect' | 'earn' | 'grow';

/** Light, self-reported context used only to personalize the visible steps. */
export interface ReentryInputs {
  /** Set only for people who explicitly request record-aware guidance. */
  justiceSupport?: boolean;
  daysSinceRelease?: number | null;
  onSupervision?: boolean;
  opioidHistory?: boolean;
  medicationNeeds?: boolean;
  hasDependents?: boolean;
  needsId?: boolean;
  housingSecure?: boolean;
}

export type JourneyActionKind = 'route' | 'tel' | 'section';
export interface JourneyAction { label: string; href: string; kind: JourneyActionKind }

export interface JourneyStep {
  id: string;
  title: string;
  why: string;
  evidence: string;
  action?: JourneyAction;
  appliesIf?: (inputs: ReentryInputs) => boolean;
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
const requestedJusticeSupport = (inputs: ReentryInputs) => inputs.justiceSupport === true;

export const PHASES: JourneyPhase[] = [
  {
    key: 'stabilize',
    title: 'Choose your direction',
    tagline: 'Start with what fits you.',
    why: 'A clear direction makes every later choice easier. Begin with your interests, strengths, and the kind of work you want next.',
    evidence: 'O*NET Interest Profiler and U.S. Department of Labor career-exploration guidance.',
    steps: [
      {
        id: 'career-fit',
        title: 'Discover work that fits you',
        why: 'A short strengths and interests check can turn a wide-open job search into a focused starting point.',
        evidence: 'The O*NET Interest Profiler links work interests to occupations and career paths.',
        action: route('Find my career fit', '/assessment'),
      },
      {
        id: 'id',
        title: 'Get help with ID or work documents',
        why: 'If a missing document is blocking work, support is available. This step appears only because you asked for it.',
        evidence: 'U.S. Department of Labor workforce centers help job seekers resolve common employment barriers.',
        action: route('Find document help', '/local-help?tab=community'),
        appliesIf: (inputs) => inputs.needsId === true,
      },
      {
        id: 'housing',
        title: 'Find stable housing support',
        why: 'A reliable place to stay can make it much easier to keep appointments, prepare, and work.',
        evidence: 'Housing stability is consistently associated with stronger employment continuity.',
        action: route('Find housing help', '/resources?need=housing'),
        appliesIf: (inputs) => inputs.housingSecure === false,
      },
      {
        id: 'meds',
        title: 'Keep your medication on track',
        why: 'If you need continuity of care, finding a clinic now can prevent a gap.',
        evidence: 'Continuity of care supports health, stability, and participation in work.',
        action: route('Find a clinic near you', '/resources?need=health'),
        appliesIf: (inputs) => inputs.medicationNeeds === true,
      },
      {
        id: 'safety-overdose',
        title: 'Protect your health right now',
        why: 'Tolerance can change after time away from opioids. Free, confidential support and naloxone resources are available.',
        evidence: 'SAMHSA overdose-prevention guidance and Binswanger et al., New England Journal of Medicine, 2007.',
        action: tel('Call SAMHSA — free, 24/7', 'tel:18006624357'),
        appliesIf: (inputs) => requestedJusticeSupport(inputs) && inputs.opioidHistory === true,
        urgent: true,
      },
      {
        id: 'supervision',
        title: 'Put every required check-in on your plan',
        why: 'Dates and reminders make required appointments easier to manage alongside work and family.',
        evidence: 'Behavioral reminder research shows that timely prompts reduce missed appointments.',
        action: route('Set up reminders', '/plan'),
        appliesIf: (inputs) => requestedJusticeSupport(inputs) && inputs.onSupervision === true,
        urgent: true,
      },
    ],
  },
  {
    key: 'connect',
    title: 'Build your plan',
    tagline: 'Turn your goal into doable steps.',
    why: 'A short plan lowers the mental load of a job search and keeps the next action visible.',
    evidence: 'Implementation-intention research finds that specific, scheduled actions improve follow-through.',
    steps: [
      {
        id: 'plan',
        title: 'Build a plan you can follow',
        why: 'Choose one goal, add the next few actions, and give each action a realistic date.',
        evidence: 'Specific goals paired with implementation intentions are more likely to be completed.',
        action: route('Build my plan', '/plan'),
      },
      {
        id: 'corner',
        title: 'Name who is in your corner',
        why: 'A mentor, friend, coach, or family member can help with feedback, encouragement, and introductions.',
        evidence: 'Social-support research consistently connects stronger networks with better employment outcomes.',
        action: section('Add someone to my corner', '#corner'),
      },
      {
        id: 'child-support',
        title: 'Make a plan for family responsibilities',
        why: 'A realistic plan for schedules and expenses can prevent surprises from disrupting work.',
        evidence: 'Family-support and financial-planning resources improve stability during employment transitions.',
        action: route('Find family and money help', '/resources?need=family'),
        appliesIf: (inputs) => inputs.hasDependents === true,
      },
      {
        id: 'mentor',
        title: 'Connect with record-aware support',
        why: 'A specialist or mentor with lived experience can help navigate background questions and local barriers.',
        evidence: 'Credible-messenger and peer-mentoring programs can strengthen engagement and follow-through.',
        action: route('Find specialized support', '/local-help?tab=reentry'),
        appliesIf: requestedJusticeSupport,
      },
    ],
  },
  {
    key: 'earn',
    title: 'Prepare to stand out',
    tagline: 'Make applying feel simple.',
    why: 'A clear résumé, a reusable application kit, and a little practice make it easier to act when the right role appears.',
    evidence: 'Career-services guidance emphasizes targeted materials, skills translation, and interview preparation.',
    steps: [
      {
        id: 'apply-kit',
        title: 'Build your application kit',
        why: 'Keep your résumé, experience, references, and key answers together so every application takes less time.',
        evidence: 'Reusable, targeted application materials reduce friction and improve job-search consistency.',
        action: route('Open my Apply Kit', '/apply-kit'),
      },
      {
        id: 'apprenticeship',
        title: 'Explore earning while you learn',
        why: 'Registered apprenticeships combine paid work, training, and wage growth.',
        evidence: 'Apprenticeship.gov describes registered apprenticeships as paid career pathways with progressive wages.',
        action: route('Browse apprenticeships', '/apprenticeships'),
      },
      {
        id: 'employer-case',
        title: 'Prepare for background questions',
        why: 'A concise, forward-looking answer can keep the conversation focused on your skills and readiness.',
        evidence: 'Fair-chance guidance recommends accurate, job-relevant, and future-focused communication.',
        action: route('Prepare my response', '/background-statement'),
        appliesIf: requestedJusticeSupport,
      },
    ],
  },
  {
    key: 'grow',
    title: 'Find work and grow',
    tagline: 'Search, apply, and keep building.',
    why: 'A focused search, steady follow-up, and continued learning turn preparation into lasting progress.',
    evidence: 'Workforce-development guidance supports focused search, skill building, and job-retention planning.',
    steps: [
      {
        id: 'first-job',
        title: 'See jobs matched to you',
        why: 'Start with roles that align with the location, skills, and industries you chose.',
        evidence: 'Person-job fit is associated with stronger satisfaction, performance, and retention.',
        action: route('See my matches', '/jobs'),
      },
      {
        id: 'retention',
        title: 'Plan for your first 90 days',
        why: 'Think ahead about transportation, schedules, support, and the people to call when something changes.',
        evidence: 'Early job-retention support helps workers navigate predictable first-month challenges.',
        action: route('Track my plan', '/plan'),
      },
      {
        id: 'learn',
        title: 'Build a skill or credential',
        why: 'A focused skill can open better-paying roles and create a path to advancement.',
        evidence: 'Workforce training and recognized credentials can improve employment and wage outcomes.',
        action: route('Explore learning', '/learn'),
      },
      {
        id: 'future-self',
        title: 'Name what you are working toward',
        why: 'A meaningful goal helps smaller actions feel connected and worth finishing.',
        evidence: 'Goal-setting research connects specific, personally meaningful goals with persistence.',
        action: section('Set my goal', '#future-self'),
      },
      {
        id: 'upgrade',
        title: 'Plan your next step up',
        why: 'Once work is steady, a new skill, credential, or role can raise your income over time.',
        evidence: 'Career-pathway programs pair employment with progressive skills and wage growth.',
        action: route('Find a step up', '/apprenticeships'),
      },
      {
        id: 'self-employment',
        title: 'Consider working for yourself',
        why: 'If entrepreneurship fits your goals, start with a small plan and free business guidance.',
        evidence: 'SCORE and Small Business Development Centers provide no-cost mentoring and planning support.',
        action: route('Explore self-employment', '/entrepreneurship'),
      },
    ],
  },
];

export function applicableSteps(phase: JourneyPhase, inputs: ReentryInputs): JourneyStep[] {
  return phase.steps.filter((step) => (step.appliesIf ? step.appliesIf(inputs) : true));
}

export interface PhaseProgress {
  phase: JourneyPhase;
  total: number;
  done: number;
  complete: boolean;
  steps: JourneyStep[];
}

export function phaseProgress(inputs: ReentryInputs, completed: Set<string>): PhaseProgress[] {
  return PHASES.map((phase) => {
    const steps = applicableSteps(phase, inputs);
    const done = steps.filter((step) => completed.has(step.id)).length;
    return { phase, steps, total: steps.length, done, complete: steps.length > 0 && done === steps.length };
  });
}

export function activePhaseKey(inputs: ReentryInputs, completed: Set<string>): JourneyPhaseKey {
  return phaseProgress(inputs, completed).find((entry) => !entry.complete)?.phase.key ?? 'grow';
}

export function nextStep(inputs: ReentryInputs, completed: Set<string>): { phase: JourneyPhase; step: JourneyStep } | null {
  for (const phase of PHASES) {
    for (const step of applicableSteps(phase, inputs)) {
      if (!completed.has(step.id)) return { phase, step };
    }
  }
  return null;
}

export function overallProgress(inputs: ReentryInputs, completed: Set<string>): { done: number; total: number; pct: number } {
  const all = PHASES.flatMap((phase) => applicableSteps(phase, inputs));
  const done = all.filter((step) => completed.has(step.id)).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

export function inCriticalWindow(inputs: ReentryInputs): boolean {
  return inputs.justiceSupport === true && inputs.daysSinceRelease != null && inputs.daysSinceRelease >= 0 && inputs.daysSinceRelease <= 180;
}

/** Sources behind the universal guidance model shown in the evidence panel. */
export const EVIDENCE_BASE: { claim: string; source: string }[] = [
  { claim: 'Career exploration works best when it begins with interests, strengths, and work values.', source: 'U.S. Department of Labor, O*NET Interest Profiler.' },
  { claim: 'Specific goals and planned next actions make follow-through more likely.', source: 'Implementation-intention research by Gollwitzer and Sheeran.' },
  { claim: 'Social support can improve persistence through a difficult job search and career transition.', source: 'Workforce-development and social-support research.' },
  { claim: 'Targeted application materials reduce friction and help candidates communicate fit.', source: 'U.S. Department of Labor career-services guidance.' },
  { claim: 'Registered apprenticeships provide paid work, training, mentorship, and progressive wages.', source: 'Apprenticeship.gov, U.S. Department of Labor.' },
  { claim: 'Skill building and recognized credentials can improve employment and wage outcomes.', source: 'Workforce Innovation and Opportunity Act career-pathway guidance.' },
  { claim: 'People who request specialized background support benefit from accurate, fair-chance guidance.', source: 'EEOC individualized-assessment guidance and fair-chance hiring resources.' },
];
