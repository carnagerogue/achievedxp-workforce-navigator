/**
 * Realistic-fit scorer.
 *
 * The live job feeds (USAJOBS, Greenhouse, …) carry NO structured
 * requiredSkills / requiredCertifications / minYearsExperience, and their
 * industry tags are noisy. With nothing to score on, every job collapsed to
 * the same neutral breakdown. This module derives the missing signals from
 * the job's title + description text and grades how realistically THIS person
 * could actually land and keep THIS role:
 *
 *   - required seniority / years of experience (title + "N+ years" in text)
 *   - degree requirements (bachelor's / graduate)
 *   - the job's real domain (inferred from text, not the noisy tag)
 *   - skill / domain overlap with the person's background
 *   - location reachability (fixes 2-letter-code vs full-state-name mismatch)
 *
 * It also returns an `attainabilityCap` — an upper bound on the FINAL score
 * so that, e.g., a Director role can't surface as a "top match" for someone
 * with four years of experience, no matter how clean the conviction picture.
 *
 * This is the "can they get it + succeed in the interview" layer; the
 * @dxp/shared compatibility engine remains the authority on conviction/legal
 * barriers. The two are blended in job-scoring.ts (scoreJobUnified).
 */
import type { JobDto } from '@dxp/shared';
import type { StoredProfile } from './profile-store';

export interface FitBreakdown {
  industry: number;
  skills: number;
  certifications: number;
  experience: number;
  location: number;
  risk: number;
}

export type RoleLevel = 'entry' | 'mid' | 'senior' | 'director' | 'executive';

export interface RealisticFit {
  total: number; // 0..100 (sum of breakdown)
  breakdown: FitBreakdown;
  requiredYears: number;
  level: RoleLevel;
  domain: string | null;
  /** Upper bound to apply to the final blended score (reality check). */
  attainabilityCap: number;
  factors: { positive: string[]; caution: string[] };
}

// ── Seniority inference ────────────────────────────────────────────────
// Checked in order, first match wins. `assistant` is deliberately NOT an
// entry marker (Assistant Controller / Assistant Director are not entry).
const SENIORITY: Array<{ re: RegExp; years: number; level: RoleLevel }> = [
  { re: /\b(chief|ceo|cfo|cto|coo|ciso|cio|c-level|president|vice\s*president|vp|svp|evp|partner|principal)\b/i, years: 13, level: 'executive' },
  { re: /\b(director|head\s+of|dean|superintendent|chair)\b/i, years: 10, level: 'director' },
  { re: /\b(senior|sr\.?|staff|lead|manager|supervisor|foreman|iii|iv|2nd\s+line)\b/i, years: 6, level: 'senior' },
  { re: /\b(associate|journey(?:man|level)|specialist|technician\s*ii|\bii\b)\b/i, years: 3, level: 'mid' },
  { re: /\b(intern|internship|trainee|apprentice|entry[-\s]?level|junior|jr\.?|helper|\bi\b)\b/i, years: 0, level: 'entry' },
];

function inferSeniority(title: string, haystack: string): { years: number; level: RoleLevel } {
  let level: RoleLevel = 'mid';
  let years = 2;
  for (const s of SENIORITY) {
    if (s.re.test(title)) { level = s.level; years = s.years; break; }
  }
  // Raise (never lower) from explicit "N+ years" phrases in the body.
  let explicit = 0;
  for (const m of haystack.matchAll(/(\d{1,2})\s*\+?\s*years?/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n <= 20 && n > explicit) explicit = n;
  }
  if (explicit > years) {
    years = explicit;
    if (years >= 12) level = 'executive';
    else if (years >= 8) level = 'director';
    else if (years >= 5) level = 'senior';
  }
  return { years, level };
}

// ── Domain inference (text-first; tag is too noisy to trust) ───────────
// Matched against the TITLE ONLY. Job *descriptions* are far too noisy for
// domain inference — an ML-engineer posting that mentions a "data warehouse",
// "inventory service", or "production environment" must not read as a
// warehousing/manufacturing role. Titles are clean. `it_general` and
// `management` are listed before the blue-collar buckets so a "Machine
// Learning Engineer" resolves to it_general, not manufacturing.
const DOMAINS: Array<{ domain: string; re: RegExp }> = [
  { domain: 'it_general',     re: /\b(software|developer|engineer(ing)?|machine\s+learning|data\s+(scientist|analyst|engineer)|programmer|cyber|cloud|devops|\bit\b|information technology|qa\b)\b/i },
  { domain: 'management',     re: /\b(product\s+manager|program\s+manager|project\s+manager|operations\s+manager|account\s+manager|business\s+(analyst|development)|strateg(y|ist)|marketing|consultant|recruiter|designer)\b/i },
  { domain: 'finance',        re: /\b(account(ant|ing)|finance|financial|controller|payroll|bookkeep|teller|auditor|treasur|underwrit|actuar)\b/i },
  { domain: 'healthcare',     re: /\b(nurse|\bcna\b|caregiver|medical|patient|phlebotom|therap(y|ist)|clinical|dental|pharmac|physician)\b/i },
  { domain: 'education',      re: /\b(teacher|tutor|instructor|professor|educat|paraeducator|faculty|lecturer)\b/i },
  { domain: 'security',       re: /\b(security|guard|surveillance|patrol|corrections?)\b/i },
  { domain: 'transportation', re: /\b(driver|\bcdl\b|truck|delivery|chauffeur|transit|courier|fleet|dispatch)\b/i },
  { domain: 'construction',   re: /\b(construction|carpenter|welder|electrician|plumber|hvac|mason|roofer|laborer|pipefitter|ironworker|trades?|installer)\b/i },
  { domain: 'manufacturing',  re: /\b(machine\s+operator|assembl(y|er)|production\s+(worker|operator|associate)|fabricat|manufactur|cnc|millwright|machinist)\b/i },
  { domain: 'warehousing',    re: /\b(warehouse|forklift|materials?\s+(handler|examiner)|order\s+(puller|picker|selector)|picker|packer|distribution|stock(er|room)?|loader|shipping|receiving)\b/i },
  { domain: 'food_service',   re: /\b(cook|chef|kitchen|restaurant|barista|server|dishwasher|food\s+service|culinary|baker)\b/i },
  { domain: 'cleaning',       re: /\b(custodian|custodial|janitor|housekeep|cleaner|sanitation|groundskeep)\b/i },
  { domain: 'retail',         re: /\b(retail|sales\s+associate|cashier|merchandis|store\s+(associate|clerk))\b/i },
  { domain: 'services',       re: /\b(customer\s+service|call\s+center|receptionist|administrative|office\s+(clerk|assistant)|clerk)\b/i },
];

export function inferDomain(title: string): string | null {
  for (const d of DOMAINS) if (d.re.test(title)) return d.domain;
  return null;
}

// ── US state code ↔ name (job feeds use full names, profiles use codes) ─
const STATE_TO_CODE: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
function toStateCode(region: string | null | undefined): string | null {
  if (!region) return null;
  const r = region.trim();
  if (/^[A-Za-z]{2}$/.test(r)) return r.toUpperCase();
  return STATE_TO_CODE[r.toLowerCase()] ?? null;
}

const tokenize = (xs: string[] | undefined): string[] =>
  (xs ?? [])
    .flatMap((s) => s.toLowerCase().split(/[\s_/-]+/))
    .map((t) => t.trim())
    .filter((t) => t.length > 2);

function wordIn(haystack: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(haystack);
}

const DEGREE_GRADUATE = /\b(master'?s|mba|ph\.?d|doctorate|graduate degree|j\.?d\.?)\b/i;
const DEGREE_BACHELOR = /\b(bachelor'?s|b\.?s\.?|b\.?a\.?|four[-\s]year degree|college degree|degree required|undergraduate degree)\b/i;
const CERT_REQUIRED   = /\b(license[d]?|certified|certification|cdl|osha|clearance|credential)\b/i;

export function realisticFit(profile: StoredProfile | null, j: JobDto): RealisticFit {
  const title = (j.title ?? '').toLowerCase();
  const haystack = `${j.title ?? ''} ${j.description ?? ''}`.toLowerCase();

  const userYears = profile?.yearsExperience ?? 0;
  const desired = new Set((profile?.desiredIndustries ?? []).map((s) => s.toLowerCase()));
  const userTerms = Array.from(new Set([...tokenize(profile?.skills), ...tokenize(profile?.desiredIndustries)]));

  const { years: requiredYears, level } = inferSeniority(title, haystack);
  const domain = inferDomain(title);
  const gap = Math.max(0, requiredYears - userYears);

  const positive: string[] = [];
  const caution: string[] = [];

  // ── experience (0..15) ──
  let experience: number;
  if (userYears >= requiredYears) { experience = 15; if (requiredYears >= 5) positive.push('your experience meets the role level'); }
  else experience = requiredYears > 0 ? Math.max(0, Math.min(15, Math.round((15 * userYears) / requiredYears))) : 15;
  if (gap >= 3) caution.push(`${level === 'executive' || level === 'director' ? `${level}-level` : 'senior'} role — typically needs ~${requiredYears}+ yrs vs your ${userYears}`);

  // ── industry / domain alignment (0..25) ──
  let industry: number;
  const domainDesired = domain !== null && desired.has(domain);
  if (domainDesired) { industry = 25; positive.push(`strong match for your ${domain.replace(/_/g, ' ')} background`); }
  else if (desired.size === 0) industry = domain ? 14 : 12;
  else if (domain && desired.size > 0) { industry = 7; caution.push(`${domain.replace(/_/g, ' ')} is outside your target fields`); }
  else industry = 11;

  // ── skills / domain overlap (0..25) ──
  // Match the user's skill terms against the TITLE only. Matching the
  // description invites homonym false-positives ("data warehouse" ≠ a
  // warehousing job), which is exactly what inflated office roles before.
  let skills: number;
  if (userTerms.length === 0) skills = 12;
  else {
    const matches = userTerms.filter((t) => wordIn(title, t)).length;
    skills = Math.max(0, Math.min(25, 5 + matches * 7));
    if (domainDesired) skills = Math.max(skills, 16);
    if (matches >= 1) positive.push('your skills match this role');
  }

  // ── certifications (0..15) ──
  let certifications: number;
  if (!CERT_REQUIRED.test(haystack)) certifications = 13;
  else {
    const userCertTerms = tokenize(profile?.certifications);
    const has = userCertTerms.some((t) => wordIn(haystack, t));
    certifications = has ? 15 : 8;
    if (!has) caution.push('a license or certification is likely required');
  }

  // ── location reachability (0..10) — fixes code vs full-name mismatch ──
  const userState = toStateCode(profile?.locationRegion);
  const jobState = toStateCode(j.locationRegion);
  let location: number;
  if (j.remote) { location = 10; positive.push('remote role'); }
  else if (profile?.locationPostalCode && j.locationPostalCode && profile.locationPostalCode === j.locationPostalCode) location = 10;
  else if (!userState || !jobState) location = 5;
  else if (userState === jobState) { location = 10; positive.push('in your state'); }
  else if (profile?.willingToRelocate) location = 6;
  else { location = 2; caution.push(`located in ${j.locationRegion} — outside your area`); }

  // ── risk tier (0..10) ──
  const risk = j.riskTier === 'LOW' ? 10 : j.riskTier === 'MEDIUM' ? 7 : 4;

  // ── attainability cap (the strong reality check) ──
  let attainabilityCap = 100;
  const cap = (v: number) => { attainabilityCap = Math.min(attainabilityCap, v); };
  if (gap >= 8) cap(48);
  else if (gap >= 5) cap(60);
  else if (gap >= 3) cap(72);
  if (level === 'executive' && userYears < 10) cap(50);
  if (level === 'director' && userYears < 8) cap(58);
  if (DEGREE_GRADUATE.test(haystack)) { cap(55); caution.push('a graduate degree is typically required'); }
  else if (DEGREE_BACHELOR.test(haystack) && userYears < 4) { cap(74); caution.push("a bachelor's degree is typically required"); }
  // Background-aligned blue-collar role with no skill overlap and an off-target domain.
  if (desired.size > 0 && domain && !domainDesired && skills <= 6) cap(70);

  const total = Math.max(0, Math.min(100, industry + skills + certifications + experience + location + risk));
  return {
    total,
    breakdown: { industry, skills, certifications, experience, location, risk },
    requiredYears,
    level,
    domain,
    attainabilityCap,
    factors: {
      positive: Array.from(new Set(positive)).slice(0, 3),
      caution: Array.from(new Set(caution)).slice(0, 3),
    },
  };
}
