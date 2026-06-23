/**
 * Free national resource directory — verified, free-to-the-user supports for
 * people leaving incarceration. Every entry was checked against its operator
 * (June 2026). Kept honest about *how* each is reached: a live hotline/text
 * line, a "find near you" locator we deep-link to, a program to apply for, or
 * naloxone by mail. Pure data; rendered by /resources and surfaced from the
 * Reentry Compass.
 *
 * Why this matters: a returning person often doesn't know these exist, and the
 * gap between "I need help" and "I found the number" is where people fall
 * through. Putting every free line in one plain-language, click-to-call place
 * is itself the intervention.
 */

export type ResourceNeed =
  | 'crisis' | 'health' | 'food' | 'housing' | 'money'
  | 'legal' | 'work' | 'family' | 'connectivity' | 'veterans';

export type ResourceKind = 'hotline' | 'text' | 'locator' | 'program' | 'mail';

export interface FreeResource {
  id: string;
  name: string;
  need: ResourceNeed;
  kind: ResourceKind;
  /** Plain-language, ~6th-grade: what it does for you. */
  desc: string;
  /** Digits only, for a tel: link (hotlines). */
  phone?: string;
  /** Human-readable dial/label, e.g. "1-800-662-4357" or "988". */
  phoneLabel?: string;
  /** SMS instruction, e.g. "Text HOME to 741741". */
  text?: string;
  /** Web locator / program page to open. */
  url?: string;
  /** Who runs it (for trust). */
  source: string;
  /** Eligibility / scam / coverage caveat to show honestly. */
  caveat?: string;
}

export const NEED_META: Record<ResourceNeed, { label: string; blurb: string }> = {
  crisis: { label: 'Someone to talk to', blurb: 'Free, confidential help any time — you are not alone.' },
  health: { label: 'Health & recovery', blurb: 'Clinics, treatment, medication, and overdose safety.' },
  food: { label: 'Food', blurb: 'Food assistance, pantries, and free meals.' },
  housing: { label: 'A place to stay', blurb: 'Shelter and housing help near you.' },
  money: { label: 'Money & benefits', blurb: 'Cash help, benefits, banking, and free tax prep.' },
  legal: { label: 'Legal & record', blurb: 'Free legal aid and clearing your record.' },
  work: { label: 'Work & training', blurb: 'Jobs, apprenticeships, and programs that hire fair-chance.' },
  family: { label: 'Family & children', blurb: 'Child support help and childcare.' },
  connectivity: { label: 'Phone & internet', blurb: 'Low-cost phone, internet, and devices.' },
  veterans: { label: 'Veterans', blurb: 'Support built for justice-involved veterans.' },
};

export const FREE_RESOURCES: FreeResource[] = [
  // ── Crisis / someone to talk to ──
  { id: '988', name: '988 Suicide & Crisis Lifeline', need: 'crisis', kind: 'hotline', phone: '988', phoneLabel: 'Call or text 988',
    desc: 'Free, confidential support 24/7 for any kind of crisis or hard time — not just suicide.', source: '988 Lifeline', },
  { id: 'crisis-text', name: 'Crisis Text Line', need: 'crisis', kind: 'text', text: 'Text HOME to 741741',
    desc: 'Talk it out by text with a trained counselor, 24/7. Good if you can’t make a call.', source: 'Crisis Text Line', },
  { id: 'dv', name: 'National Domestic Violence Hotline', need: 'crisis', kind: 'hotline', phone: '18007997233', phoneLabel: '1-800-799-7233',
    text: 'Text START to 88788', desc: 'Confidential help and safety planning if home isn’t safe.', source: 'The Hotline', },

  // ── Health & recovery ──
  { id: 'samhsa', name: 'SAMHSA National Helpline', need: 'health', kind: 'hotline', phone: '18006624357', phoneLabel: '1-800-662-4357',
    desc: 'Free, confidential, 24/7. They connect you to local treatment and support for mental health or substance use.', source: 'SAMHSA', },
  { id: 'findtreatment', name: 'Find treatment near you', need: 'health', kind: 'locator', url: 'https://findtreatment.gov',
    desc: 'Search ~12,000 free and low-cost treatment programs, including medication for opioid use.', source: 'SAMHSA · FindTreatment.gov', },
  { id: 'hrsa', name: 'Find a free / low-cost clinic', need: 'health', kind: 'locator', url: 'https://findahealthcenter.hrsa.gov',
    desc: 'Health centers that charge based on what you can afford — medical, dental, and mental health.', source: 'HRSA', },
  { id: 'neveruse', name: 'Never Use Alone', need: 'health', kind: 'hotline', phone: '18004843731', phoneLabel: '1-800-484-3731',
    desc: 'If you use alone, someone stays on the line and sends help if you stop responding. No judgment.', source: 'Never Use Alone', },
  { id: 'nextdistro', name: 'Free naloxone (Narcan) by mail', need: 'health', kind: 'mail', url: 'https://nextdistro.org/naloxone',
    desc: 'Get overdose-reversal medication mailed to you, free and discreet. After time inside your tolerance is lower — this saves lives.', source: 'NEXT Distro', caveat: 'Available in many states; not every ZIP.', },

  // ── Food ──
  { id: 'hunger', name: 'National Hunger Hotline', need: 'food', kind: 'hotline', phone: '18663486479', phoneLabel: '1-866-348-6479',
    text: 'Text your ZIP to 914-342-7744', desc: 'They point you to nearby food banks, free meals, and benefits.', source: 'USDA · Hunger Free America', },
  { id: 'foodbank', name: 'Find a food bank', need: 'food', kind: 'locator', url: 'https://www.feedingamerica.org/find-your-local-foodbank',
    desc: 'Locate the food bank and pantries closest to you.', source: 'Feeding America', },
  { id: 'snap', name: 'Apply for food assistance (SNAP)', need: 'food', kind: 'program', url: 'https://www.fns.usda.gov/snap/state-directory',
    desc: 'Monthly money for groceries. Apply through your state — start here.', source: 'USDA SNAP', caveat: 'Apply with your state, never by phone. Watch for scam calls.', },

  // ── A place to stay ──
  { id: 'hud-shelter', name: 'Find shelter near you', need: 'housing', kind: 'locator', url: 'https://www.hud.gov/findshelter',
    desc: 'Shelter, food, clothing, and clinics, mapped near you.', source: 'HUD', },
  { id: '211-housing', name: 'Call 211 for shelter & local help', need: 'housing', kind: 'hotline', phone: '211', phoneLabel: 'Dial 211',
    desc: 'One free call connects you to shelter, food, utilities, and almost any local service.', source: 'United Way 211', },

  // ── Money & benefits ──
  { id: '211-money', name: '211 — help with almost anything', need: 'money', kind: 'hotline', phone: '211', phoneLabel: 'Dial 211',
    desc: 'Free, confidential. Rent and utility help, benefits, reentry programs, and more.', source: 'United Way 211', },
  { id: 'benefitfinder', name: 'See what benefits you qualify for', need: 'money', kind: 'locator', url: 'https://www.usa.gov/benefit-finder',
    desc: 'Answer a few questions and get a list of benefits you may be able to get.', source: 'USA.gov', },
  { id: 'bankon', name: 'Open a safe, low-cost bank account', need: 'money', kind: 'program', url: 'https://joinbankon.org/accounts/',
    desc: 'Accounts with no overdraft fees that work even if you’ve had bank trouble before.', source: 'Bank On', },
  { id: 'vita', name: 'Free tax preparation', need: 'money', kind: 'locator', url: 'https://www.irs.gov/individuals/irs-free-tax-return-preparation-programs',
    phone: '18009069887', phoneLabel: '1-800-906-9887', desc: 'Get your taxes done for free — and claim refunds you’re owed.', source: 'IRS VITA', },

  // ── Legal & record ──
  { id: 'lawhelp', name: 'Find free legal aid', need: 'legal', kind: 'locator', url: 'https://www.lawhelp.org',
    desc: 'Free nonprofit lawyers for housing, family, debt, and ID problems.', source: 'LawHelp.org / LSC', },
  { id: 'cleanslate', name: 'Clear or seal your record', need: 'legal', kind: 'locator', url: 'https://nationalreentryresourcecenter.org/clean-slate-clearinghouse',
    desc: 'State-by-state info on expunging or sealing a record — and who can help you do it.', source: 'Clean Slate Clearinghouse', },

  // ── Work & training ──
  { id: 'reentry-programs', name: 'Reentry programs & job centers near you', need: 'work', kind: 'locator', url: '/local-help',
    desc: 'Free help with résumés, fair-chance employers, and transitional services.', source: 'U.S. Dept. of Labor', },
  { id: 'apprenticeship', name: 'Find an apprenticeship', need: 'work', kind: 'locator', url: '/apprenticeships',
    desc: 'Earn a paycheck while you learn a trade — many welcome people with records.', source: 'Apprenticeship.gov / DOL', },
  { id: 'bonding-wotc', name: 'Make hiring you low-risk for employers', need: 'work', kind: 'program', url: '/background-statement',
    desc: 'Two federal programs — free Federal Bonding and a tax credit (WOTC) — give employers a reason to say yes.', source: 'U.S. Dept. of Labor / IRS', },

  // ── Family & children ──
  { id: 'childsupport', name: 'Lower what you owe in child support', need: 'family', kind: 'locator', url: 'https://www.acf.gov/css/contact-information/parents',
    desc: 'Payments can often be changed to what you can actually afford. Find your local office.', source: 'Office of Child Support Services', },
  { id: 'childcare', name: 'Find childcare help', need: 'family', kind: 'locator', url: 'https://childcare.gov',
    desc: 'Search for childcare and assistance paying for it.', source: 'Childcare.gov', },

  // ── Phone & internet ──
  { id: 'lifeline', name: 'Low-cost phone & internet', need: 'connectivity', kind: 'program', url: 'https://www.lifelinesupport.org',
    desc: 'A monthly discount on phone or internet if you’re on SNAP, Medicaid, or low income.', source: 'FCC Lifeline', },
  { id: 'pcsforpeople', name: 'Low-cost computers', need: 'connectivity', kind: 'program', url: 'https://www.pcsforpeople.org',
    desc: 'Affordable refurbished computers and internet if you qualify.', source: 'PCs for People', },

  // ── Veterans ──
  { id: 'vcl', name: 'Veterans Crisis Line', need: 'veterans', kind: 'hotline', phone: '988', phoneLabel: 'Call 988, then press 1',
    text: 'Text 838255', desc: 'Confidential crisis support for veterans — no VA enrollment needed.', source: 'VA', },
  { id: 'vjo', name: 'Veterans Justice Outreach', need: 'veterans', kind: 'locator', url: 'https://www.va.gov/homeless/vjo.asp',
    desc: 'VA specialists who help justice-involved veterans with housing, treatment, and healthcare.', source: 'VA', },
];

/** Resources for a need, in catalog order. */
export function resourcesFor(need: ResourceNeed): FreeResource[] {
  return FREE_RESOURCES.filter((r) => r.need === need);
}

/** The always-visible crisis lines (surfaced at the top, everywhere). */
export const CRISIS_LINES = FREE_RESOURCES.filter((r) => r.need === 'crisis');

export const RESOURCE_KIND_LABEL: Record<ResourceKind, string> = {
  hotline: 'Call', text: 'Text', locator: 'Find near you', program: 'Apply', mail: 'By mail',
};
