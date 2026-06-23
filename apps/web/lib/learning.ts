/**
 * Low-cost learning directory — free and affordable ways to build skills and
 * earn credentials, a documented lever for reentry success (RAND: correctional
 * education is tied to ~43% lower odds of returning to prison). Honest about
 * cost: prices shift, so each entry carries a qualitative cost tag and a plain
 * note rather than a dollar figure that could go stale. Pure data; rendered by
 * /learn.
 */

export type LearnCost = 'free' | 'free-audit' | 'low-cost' | 'free-program';

export const LEARN_COST_META: Record<LearnCost, { label: string; tone: 'good' | 'info' | 'maybe' | 'special' }> = {
  free: { label: 'Always free', tone: 'good' },
  'free-audit': { label: 'Free to start', tone: 'info' },
  'low-cost': { label: 'Low cost', tone: 'maybe' },
  'free-program': { label: 'Free program', tone: 'special' },
};

export type LearnCategory = 'free' | 'credit' | 'certs' | 'programs';

export const LEARN_CATEGORY_META: Record<LearnCategory, { label: string; blurb: string }> = {
  free: { label: 'Free to learn anything', blurb: 'Build skills at no cost — from computer basics to coding.' },
  credit: { label: 'Real college credit, cheap', blurb: 'Earn transferable credit for far less than tuition — even free.' },
  certs: { label: 'Job-ready certificates', blurb: 'Skills employers ask for. Free to start; aid can cover the rest.' },
  programs: { label: 'Free training programs', blurb: 'Tuition-free training that helps you land a job, some built for people with records.' },
};

export interface LearnResource {
  id: string;
  name: string;
  category: LearnCategory;
  cost: LearnCost;
  /** Plain-language what + honest cost reality. */
  desc: string;
  url: string;
  source: string;
  /** True when it specifically serves justice-impacted or low-income learners. */
  reentryFriendly?: boolean;
}

export const LEARN_RESOURCES: LearnResource[] = [
  // ── Free to learn ──
  { id: 'khan', name: 'Khan Academy', category: 'free', cost: 'free',
    desc: 'Free lessons in math, reading, and test prep (including GED and SAT). Great to brush up before a course or a job.', url: 'https://www.khanacademy.org', source: 'Khan Academy' },
  { id: 'gcf', name: 'GCFGlobal (Goodwill)', category: 'free', cost: 'free',
    desc: 'Free, simple lessons on computers, email, the internet, Microsoft Office, and job skills — perfect if tech feels new.', url: 'https://edu.gcfglobal.org', source: 'Goodwill Community Foundation' },
  { id: 'freecodecamp', name: 'freeCodeCamp', category: 'free', cost: 'free',
    desc: 'Learn to code for free, with free certifications. A real path into tech with no cost at all.', url: 'https://www.freecodecamp.org', source: 'freeCodeCamp' },
  { id: 'alison', name: 'Alison', category: 'free', cost: 'free',
    desc: 'Thousands of free courses across many fields. You only pay if you want a printed certificate.', url: 'https://alison.com', source: 'Alison' },

  // ── College credit, low cost ──
  { id: 'modernstates', name: 'Modern States — "Freshman Year for Free"', category: 'credit', cost: 'free',
    desc: 'Free courses that prep you for CLEP exams — and they give a voucher that covers the exam fee, so you can earn real college credit for $0.', url: 'https://modernstates.org', source: 'Modern States', reentryFriendly: true },
  { id: 'sophia', name: 'Sophia Learning', category: 'credit', cost: 'low-cost',
    desc: 'A low monthly subscription for self-paced courses that transfer for college credit at many schools. Cancel anytime.', url: 'https://www.sophia.org', source: 'Sophia Learning' },
  { id: 'studycom', name: 'Study.com', category: 'credit', cost: 'low-cost',
    desc: 'A low monthly subscription with courses and exams that can earn transferable college credit.', url: 'https://study.com', source: 'Study.com' },

  // ── Job-ready certificates ──
  { id: 'google', name: 'Google Career Certificates', category: 'certs', cost: 'free-audit',
    desc: 'Job-ready certificates in IT support, data, project management, UX, and cybersecurity. Monthly cost — but scholarships and financial aid are widely available.', url: 'https://grow.google/certificates/', source: 'Google (on Coursera)' },
  { id: 'coursera', name: 'Coursera', category: 'certs', cost: 'free-audit',
    desc: 'Thousands of university and company courses — free to audit. Certificates cost extra, but you can apply for financial aid that often makes them free.', url: 'https://www.coursera.org', source: 'Coursera' },
  { id: 'edx', name: 'edX', category: 'certs', cost: 'free-audit',
    desc: 'Free-to-audit courses from top universities. Certificates are optional; learn the skills either way.', url: 'https://www.edx.org', source: 'edX' },

  // ── Free training programs ──
  { id: 'perscholas', name: 'Per Scholas', category: 'programs', cost: 'free-program',
    desc: 'Tuition-free tech training with job-placement support. No cost to you.', url: 'https://perscholas.org', source: 'Per Scholas', reentryFriendly: true },
  { id: 'lastmile', name: 'The Last Mile', category: 'programs', cost: 'free-program',
    desc: 'Coding and tech training built specifically for justice-impacted people — inside facilities and after release.', url: 'https://thelastmile.org', source: 'The Last Mile', reentryFriendly: true },
  { id: 'merit', name: 'Merit America', category: 'programs', cost: 'free-program',
    desc: 'Flexible, low-to-no-cost training for in-demand careers, built for working adults — pay later, only once you’re earning.', url: 'https://www.meritamerica.org', source: 'Merit America' },
  { id: 'npower', name: 'NPower', category: 'programs', cost: 'free-program',
    desc: 'Free tech training and job placement for veterans and young adults.', url: 'https://www.npower.org', source: 'NPower' },
];

/** Money-saving tips so paid platforms cost little or nothing. */
export const LEARN_TIPS: string[] = [
  'On Coursera and edX, choose “Audit” to take the course free — you only pay if you want the certificate.',
  'On Coursera, apply for financial aid — it often makes a paid certificate completely free.',
  'Use Modern States to study free, then a free voucher covers your CLEP exam — real college credit for $0.',
  'Your public library card often unlocks LinkedIn Learning and more, free.',
  'Ask a free SCORE or job-center mentor which credential actually leads to a job before you pay for one.',
];

export function learnByCategory(cat: LearnCategory): LearnResource[] {
  return LEARN_RESOURCES.filter((r) => r.category === cat);
}
