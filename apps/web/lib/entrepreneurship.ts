/**
 * Entrepreneurship guidance — a plain-language path to working for yourself.
 *
 * Self-employment is a real route for justice-impacted people: your own
 * business never runs a background check on you, and many trades and services
 * start small. It's framed honestly (income is unstable early; some licenses
 * and a little runway help; often best alongside a job at first) and points to
 * free, real mentoring, learning, and funding. Pure data; rendered by
 * /entrepreneurship.
 */

export interface BizStage {
  id: string;
  title: string;
  why: string;          // plain-language what/why
  tip: string;          // one concrete first action
  reentryNote?: string; // record-specific note where relevant
}

export const BIZ_STAGES: BizStage[] = [
  {
    id: 'fit',
    title: '1. Decide if it’s right for you',
    why: 'Being your own boss means freedom — and no employer can turn you down for your record. It also means unsteady money at first and everything riding on you.',
    tip: 'A good sign you’re ready: a skill people already pay for, a little savings to live on, and the patience to start small.',
    reentryNote: 'Many people start a side business while keeping a job, then go full-time once it’s steady. That’s smart, not second-best.',
  },
  {
    id: 'idea',
    title: '2. Pick and test an idea',
    why: 'The best first business is usually a skill you already have. Start with what you can do today, for people near you.',
    tip: 'Before spending money, find 3 people who would actually pay you. If you can’t, adjust the idea — that’s cheap to learn now.',
  },
  {
    id: 'legal',
    title: '3. Make it legal',
    why: 'Registering protects you and lets you get paid properly. Most small businesses start as a sole proprietor or an LLC.',
    tip: 'Get a free EIN (tax ID) from the IRS in minutes, check if your work needs a license, and keep business money separate from personal.',
    reentryNote: 'Some service jobs (in homes, with cash) ask for a bond — the free Federal Bonding Program can cover you. Licensing rules vary by state; check before you commit.',
  },
  {
    id: 'money',
    title: '4. Get a little money to start',
    why: 'Most small businesses begin lean. You usually need less than you think — tools, supplies, and a way to reach customers.',
    tip: 'Look for 0%-interest microloans (Kiva) and mission lenders (CDFIs) before any high-interest loan. Never use a predatory payday or title loan to fund a business.',
  },
  {
    id: 'customers',
    title: '5. Get your first customers',
    why: 'Your first jobs come from people who know you and word of mouth. Do great work, ask for referrals, and show up on time.',
    tip: 'Tell everyone what you do, set fair and clear prices, and ask happy customers to refer a friend or leave a review.',
  },
  {
    id: 'grow',
    title: '6. Keep it steady and grow',
    why: 'Staying in business beats a fast start that burns out. Track your money simply and reinvest a little at a time.',
    tip: 'Set aside money for taxes, keep simple records, and meet with a free mentor every month — they help you avoid costly mistakes.',
  },
];

export interface BizResource {
  id: string;
  name: string;
  what: string;
  url: string;
  source: string;
  tag: 'mentor' | 'learn' | 'money' | 'legal';
}

export const BIZ_RESOURCE_TAG: Record<BizResource['tag'], string> = {
  mentor: 'Free mentor', learn: 'Free course', money: 'Funding', legal: 'Set up',
};

export const BIZ_RESOURCES: BizResource[] = [
  // Mentoring / advising — free
  { id: 'score', name: 'SCORE — a free business mentor', what: 'Get matched with an experienced mentor who guides you for free, by phone or video.', url: 'https://www.score.org', source: 'SCORE (SBA partner)', tag: 'mentor' },
  { id: 'sbdc', name: 'Small Business Development Center', what: 'Free one-on-one local advising on starting and running a business.', url: 'https://americassbdc.org', source: 'America’s SBDC', tag: 'mentor' },
  { id: 'sba', name: 'SBA — how to start a business', what: 'Plain-language guides from the U.S. Small Business Administration, plus local help.', url: 'https://www.sba.gov/business-guide', source: 'U.S. Small Business Administration', tag: 'learn' },
  // Reentry-specific entrepreneurship education
  { id: 'i2e', name: 'Inmates to Entrepreneurs', what: 'Free entrepreneurship education built specifically for people with a criminal record.', url: 'https://inmatestoentrepreneurs.org', source: 'Inmates to Entrepreneurs', tag: 'learn' },
  { id: 'defy', name: 'Defy Ventures', what: 'Coaching and training that helps justice-impacted people start businesses.', url: 'https://www.defyventures.org', source: 'Defy Ventures', tag: 'learn' },
  // Money
  { id: 'kiva', name: 'Kiva — 0% interest microloans', what: 'Borrow up to $15,000 at 0% interest, funded by everyday people. No credit score needed to start.', url: 'https://www.kiva.org/borrow', source: 'Kiva', tag: 'money' },
  { id: 'sba-micro', name: 'SBA microloans', what: 'Small loans (often up to $50,000) through nonprofit, mission-driven lenders.', url: 'https://www.sba.gov/funding-programs/loans/microloans', source: 'U.S. Small Business Administration', tag: 'money' },
  // Set up
  { id: 'ein', name: 'Get a free tax ID (EIN)', what: 'Register your business with the IRS in minutes — always free, never pay a third party for this.', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number', source: 'IRS', tag: 'legal' },
  { id: 'bonding', name: 'Federal Bonding (if a job needs a bond)', what: 'Free bonding that reassures customers and employers when you work in homes or with cash.', url: 'https://bonds4jobs.com', source: 'U.S. Dept. of Labor', tag: 'legal' },
];

export interface BizIdea { name: string; note: string }

/** Low-startup-cost, record-friendly business ideas to spark thinking. */
export const BIZ_IDEAS: BizIdea[] = [
  { name: 'Cleaning / janitorial', note: 'Homes or offices. Low startup, steady demand, start solo.' },
  { name: 'Lawn care & landscaping', note: 'Seasonal but easy to start with basic equipment.' },
  { name: 'Handyman & small repairs', note: 'If you’re handy, neighbors always need help.' },
  { name: 'Auto detailing', note: 'Mobile detailing needs little more than supplies and a ride.' },
  { name: 'Moving & hauling', note: 'A truck and strong work ethic go a long way.' },
  { name: 'Food — vending or cottage food', note: 'Many states let you sell certain homemade foods. Check local rules.' },
  { name: 'Trucking / CDL', note: 'A CDL opens owner-operator work. See apprenticeships and training.' },
  { name: 'Barber / cosmetology', note: 'Requires a license, but a steady, people-facing trade.' },
  { name: 'Reselling / e-commerce', note: 'Flip goods online with almost no startup cost.' },
  { name: 'Skilled trades', note: 'Electrical, plumbing, welding — pair a business with an apprenticeship.' },
];
