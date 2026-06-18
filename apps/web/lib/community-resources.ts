/**
 * Curated, vetted community-support resources by category — the wraparound
 * services a justice-impacted job seeker needs to keep a job.
 *
 * These are real national programs and official government locators (HUD,
 * Feeding America, SAMHSA, HRSA, LawHelp, Childcare.gov, CareerOneStop, 211).
 * findhelp's own hyperlocal directory is only available via their paid partner
 * API or by scraping (which they block), so rather than copy their data we
 * surface these authoritative, free sources in-app — each can be added to the
 * user's checklist — and offer a single "search hyperlocal options on
 * findhelp.org" link per category for extra depth.
 */

export interface CommunityResource {
  id: string;
  name: string;
  desc: string;
  phone?: string;
  url: string;
}

export const COMMUNITY_RESOURCES: Record<string, CommunityResource[]> = {
  housing: [
    { id: 'svc-housing-hud', name: 'HUD — Find Shelter', desc: 'Official U.S. HUD tool for emergency shelter, housing, and supportive services near you.', url: 'https://www.hud.gov/findshelter' },
    { id: 'svc-housing-211', name: '211 — Housing & Rent Help', desc: 'Dial 211 for 24/7 referrals to local shelters and rent/utility assistance.', phone: '211', url: 'https://www.211.org' },
  ],
  food: [
    { id: 'svc-food-feedingamerica', name: 'Feeding America — Food Bank Finder', desc: 'Locate food banks and pantries in your area.', url: 'https://www.feedingamerica.org/find-your-local-foodbank' },
    { id: 'svc-food-hotline', name: 'USDA National Hunger Hotline', desc: 'Call for referrals to local food assistance, SNAP, WIC, and summer meals.', phone: '1-866-348-6479', url: 'https://www.fns.usda.gov/' },
  ],
  transit: [
    { id: 'svc-transit-211', name: '211 — Transportation Help', desc: 'Dial 211 for bus passes, gas help, and rides to work or appointments.', phone: '211', url: 'https://www.211.org' },
    { id: 'svc-transit-modestneeds', name: 'Modest Needs', desc: 'Emergency grants for car repairs, gas, and other work-related costs.', url: 'https://www.modestneeds.org' },
  ],
  legal: [
    { id: 'svc-legal-lawhelp', name: 'LawHelp.org', desc: 'Free legal-aid programs in your state for record clearing, ID, housing, and benefits.', url: 'https://www.lawhelp.org' },
    { id: 'svc-legal-cleanslate', name: 'Clean Slate Initiative', desc: 'How to clear or expunge your record, state by state.', url: 'https://www.cleanslateinitiative.org' },
  ],
  health: [
    { id: 'svc-health-samhsa', name: 'FindTreatment.gov (SAMHSA)', desc: 'Confidential, free, 24/7 help finding mental-health and substance-use treatment.', phone: '1-800-662-4357', url: 'https://findtreatment.gov' },
    { id: 'svc-health-hrsa', name: 'HRSA — Find a Health Center', desc: 'Free or low-cost community clinics that serve everyone, with or without insurance.', url: 'https://findahealthcenter.hrsa.gov' },
    { id: 'svc-health-988', name: '988 Suicide & Crisis Lifeline', desc: 'Call or text 988 for free, confidential crisis support, 24/7.', phone: '988', url: 'https://988lifeline.org' },
  ],
  money: [
    { id: 'svc-money-benefits', name: 'Benefits.gov', desc: 'Find federal and state benefits you may qualify for.', url: 'https://www.benefits.gov' },
    { id: 'svc-money-211', name: '211 — Financial Assistance', desc: 'Dial 211 for emergency cash, utility help, and benefits navigation.', phone: '211', url: 'https://www.211.org' },
  ],
  family: [
    { id: 'svc-family-childcaregov', name: 'Childcare.gov', desc: 'Find child care and financial-assistance programs in your state.', url: 'https://www.childcare.gov' },
    { id: 'svc-family-211', name: '211 — Family Support', desc: 'Dial 211 for parenting, childcare, and family-support referrals.', phone: '211', url: 'https://www.211.org' },
  ],
  clothing: [
    { id: 'svc-clothing-dfs', name: 'Dress for Success', desc: 'Free professional attire and interview coaching (primarily for women).', url: 'https://dressforsuccess.org' },
    { id: 'svc-clothing-careergear', name: 'Career Gear', desc: 'Professional clothing and job-readiness support for men.', url: 'https://www.careergear.org' },
    { id: 'svc-clothing-goodwill', name: 'Goodwill', desc: 'Affordable clothing and free job-readiness services nationwide.', url: 'https://www.goodwill.org' },
  ],
  education: [
    { id: 'svc-education-cos', name: 'CareerOneStop — Find Training', desc: 'Local training, GED, and adult-education programs (U.S. Dept. of Labor).', url: 'https://www.careeronestop.org/Toolkit/Training/find-training.aspx' },
    { id: 'svc-education-goodwill', name: 'Goodwill — Job Training', desc: 'Free skills training, digital literacy, and credential programs.', url: 'https://www.goodwill.org/jobs-training/' },
  ],
};
