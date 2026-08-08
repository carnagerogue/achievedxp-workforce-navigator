/**
 * Evidence-backed occupational eligibility checks.
 *
 * This module deliberately does not answer "will this employer hire me?".
 * It identifies a small set of federal regulatory contexts that can affect
 * eligibility, then separates them from state licensing and employer review.
 * Broad conviction categories are never treated as exact legal diagnoses.
 *
 * Sources were last reviewed 2026-08-08. Rules should be re-reviewed at
 * least quarterly and whenever a cited authority changes.
 */
import type { CandidateProfile, ConvictionType, JobInput } from './types';

export type EligibilityStatus =
  | 'likely_disqualified'
  | 'waiver_or_approval_required'
  | 'license_or_agency_review'
  | 'individualized_review'
  | 'no_occupation_specific_bar_found';

export type EvidenceScope = 'federal_rule' | 'state_rules_vary' | 'employer_policy' | 'duty_relevance';

export interface EligibilitySource {
  title: string;
  citation: string;
  url: string;
  authority: string;
  lastReviewed: string;
}

export interface EligibilityFinding {
  ruleId: string;
  status: Exclude<EligibilityStatus, 'no_occupation_specific_bar_found'>;
  scope: EvidenceScope;
  title: string;
  explanation: string;
  whatToVerify: string;
  sources: EligibilitySource[];
}

export interface EligibilityAssessment {
  highestStatus: EligibilityStatus;
  findings: EligibilityFinding[];
  missingFacts: string[];
  jurisdiction: string | null;
  disclaimer: string;
}

const REVIEWED = '2026-08-08';

export const ELIGIBILITY_SOURCES = {
  eeoc: {
    title: 'EEOC criminal-record employment guidance',
    citation: 'Title VII; Green factors and individualized assessment',
    url: 'https://www.eeoc.gov/laws/guidance/enforcement-guidance-consideration-arrest-and-conviction-records-employment-decisions',
    authority: 'U.S. Equal Employment Opportunity Commission', lastReviewed: REVIEWED,
  },
  childcare: {
    title: 'Federal child-care background-check requirements',
    citation: '42 U.S.C. § 9858f(c)',
    url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section9858f',
    authority: 'U.S. House Office of the Law Revision Counsel', lastReviewed: REVIEWED,
  },
  firearms: {
    title: 'Federal prohibited-person rules for firearms',
    citation: '18 U.S.C. § 922(g)',
    url: 'https://www.atf.gov/firearms/tools-services-law-enforcement/identify-prohibited-persons',
    authority: 'Bureau of Alcohol, Tobacco, Firearms and Explosives', lastReviewed: REVIEWED,
  },
  healthcare: {
    title: 'HHS-OIG exclusion authorities',
    citation: 'Social Security Act § 1128; 42 U.S.C. § 1320a-7',
    url: 'https://oig.hhs.gov/exclusions/background-information-exclusion-authorities/',
    authority: 'U.S. Department of Health and Human Services, Office of Inspector General', lastReviewed: REVIEWED,
  },
  leie: {
    title: 'HHS-OIG List of Excluded Individuals and Entities',
    citation: 'LEIE verification',
    url: 'https://exclusions.oig.hhs.gov/',
    authority: 'U.S. Department of Health and Human Services, Office of Inspector General', lastReviewed: REVIEWED,
  },
  banking: {
    title: 'Fair Hiring in Banking Act and FDIA Section 19',
    citation: '12 U.S.C. § 1829; 12 C.F.R. part 303, subpart L',
    url: 'https://www.fdic.gov/news/financial-institution-letters/2023/fil23009.html',
    authority: 'Federal Deposit Insurance Corporation', lastReviewed: REVIEWED,
  },
  securities: {
    title: 'FINRA statutory-disqualification eligibility process',
    citation: 'Exchange Act § 3(a)(39); FINRA Rule 9520 Series',
    url: 'https://www.finra.org/rules-guidance/guidance/eligibility-requirements',
    authority: 'Financial Industry Regulatory Authority', lastReviewed: REVIEWED,
  },
  insurance: {
    title: 'Crimes affecting persons engaged in the business of insurance',
    citation: '18 U.S.C. § 1033(e)',
    url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title18-section1033',
    authority: 'U.S. House Office of the Law Revision Counsel', lastReviewed: REVIEWED,
  },
  cdl: {
    title: 'Commercial-driver disqualification rules',
    citation: '49 C.F.R. § 383.51',
    url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-383/subpart-D/section-383.51',
    authority: 'Federal Motor Carrier Safety Administration', lastReviewed: REVIEWED,
  },
  airport: {
    title: 'Airport secure-area criminal-history requirements',
    citation: '49 C.F.R. §§ 1542.209, 1544.229',
    url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-XII/subchapter-C/part-1544/subpart-C/section-1544.229',
    authority: 'Transportation Security Administration', lastReviewed: REVIEWED,
  },
  twic: {
    title: 'TWIC and hazardous-material endorsement disqualifying offenses',
    citation: '49 C.F.R. § 1572.103',
    url: 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-XII/subchapter-D/part-1572/subpart-B/section-1572.103',
    authority: 'Transportation Security Administration', lastReviewed: REVIEWED,
  },
  federal: {
    title: 'Federal employment suitability guidance',
    citation: '5 C.F.R. part 731',
    url: 'https://www.opm.gov/frequently-asked-questions/suitability-executive-agent-faq/suitability-adjudications/what-if-someone-has-a-criminal-record-or-other-problems-in-their-past/',
    authority: 'U.S. Office of Personnel Management', lastReviewed: REVIEWED,
  },
  clearance: {
    title: 'National-security whole-person adjudication',
    citation: 'Security Executive Agent Directive 4',
    url: 'https://www.dcsa.mil/Trust-Decision-Adjudications/',
    authority: 'Defense Counterintelligence and Security Agency', lastReviewed: REVIEWED,
  },
  licenses: {
    title: 'State occupational License Finder',
    citation: 'State licensing requirements by occupation',
    url: 'https://www.careeronestop.org/Toolkit/Training/find-licenses.aspx',
    authority: 'U.S. Department of Labor CareerOneStop', lastReviewed: REVIEWED,
  },
} satisfies Record<string, EligibilitySource>;

const STATUS_RANK: Record<EligibilityStatus, number> = {
  no_occupation_specific_bar_found: 0,
  individualized_review: 1,
  license_or_agency_review: 2,
  waiver_or_approval_required: 3,
  likely_disqualified: 4,
};

function yearsSince(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'number'
    ? new Date(Date.UTC(value, 0, 1))
    : /^\d{4}$/.test(String(value))
      ? new Date(Date.UTC(Number(value), 0, 1))
      : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function corpus(job: JobInput): string {
  return `${job.title} ${job.company ?? ''} ${job.description ?? ''} ${job.industry ?? ''}`.toLowerCase();
}

function has(text: string, pattern: RegExp): boolean { return pattern.test(text); }

function isFelony(candidate: CandidateProfile): boolean {
  return candidate.convictionCategory === 'FELONY';
}

function detail(candidate: CandidateProfile): string {
  return (candidate.exactOffense ?? '').toLowerCase();
}

function likelyDishonesty(conviction: ConvictionType | undefined, exact: string): boolean {
  return conviction === 'financial_fraud' || conviction === 'property_theft' ||
    /fraud|embezzl|forger|false statement|money laundering|breach of trust|larceny|theft/.test(exact);
}

function airportListedOffense(conviction: ConvictionType | undefined, exact: string, felony: boolean): boolean {
  if (/murder|kidnapp|hostage|rape|aggravated sexual|arson|robbery|extortion|bribery|espionage|sedition|treason/.test(exact)) return true;
  if (conviction === 'weapons_related' || conviction === 'drug_distribution') return true;
  if (!felony) return false;
  return ['violent_offense', 'registry_related', 'property_theft', 'burglary', 'financial_fraud', 'drug_possession'].includes(conviction ?? '');
}

function childCarePermanentOffense(conviction: ConvictionType | undefined, exact: string): boolean {
  if (conviction === 'registry_related') return true;
  return /murder|child abuse|child neglect|child pornography|spousal abuse|domestic violence|rape|sexual assault|kidnapp|arson|physical assault|battery/.test(exact);
}

function finding(
  ruleId: string,
  status: EligibilityFinding['status'],
  scope: EvidenceScope,
  title: string,
  explanation: string,
  whatToVerify: string,
  sources: EligibilitySource[],
): EligibilityFinding {
  return { ruleId, status, scope, title, explanation, whatToVerify, sources };
}

/**
 * Assess one conviction against one job. A finding is only categorical when
 * the available facts match a specific federal rule. Everything else is
 * routed to verification or individualized review.
 */
export function assessRegulatedEligibility(candidate: CandidateProfile, job: JobInput): EligibilityAssessment {
  const conviction = candidate.convictionType;
  const text = corpus(job);
  const exact = detail(candidate);
  const felony = isFelony(candidate);
  const convictionAge = yearsSince(candidate.convictionDate);
  const releaseAge = yearsSince(candidate.releaseDate);
  const region = (job.locationRegion ?? candidate.convictionJurisdiction ?? '').toUpperCase() || null;
  const findings: EligibilityFinding[] = [];
  const missingFacts = new Set<string>();

  if (!conviction) {
    return {
      highestStatus: 'no_occupation_specific_bar_found', findings: [], missingFacts: [], jurisdiction: region,
      disclaimer: 'No record-aware eligibility screening was requested for this match.',
    };
  }

  if (!candidate.convictionCategory) missingFacts.add('felony, misdemeanor, or infraction classification');
  if (!candidate.convictionDate) missingFacts.add('conviction date');
  if (!candidate.releaseDate && felony) missingFacts.add('release or sentence-completion date');
  if (!candidate.exactOffense) missingFacts.add('exact offense name/statute');
  if (!region) missingFacts.add('job state');

  const firearmDuty = has(text, /\b(armed security|armed guard|carry (a )?firearm|firearm required|service weapon|possess firearms?|handle firearms?|gun store|firearms dealer)\b/);
  if (firearmDuty && felony && !candidate.firearmRightsRestored) {
    findings.push(finding(
      'federal.firearm_possession', 'likely_disqualified', 'federal_rule',
      'Federal firearm-possession restriction likely applies',
      'This role appears to require possessing or handling a firearm. A felony classification usually triggers the federal prohibited-person rule unless a legally effective restoration or other exception applies.',
      'Confirm the offense maximum penalty and whether federal firearm rights were restored before pursuing an armed role.',
      [ELIGIBILITY_SOURCES.firearms],
    ));
  }

  const childCare = has(text, /\b(child ?care|daycare|pre[- ]?school|head start|nursery school|child development center)\b/);
  if (childCare) {
    if (childCarePermanentOffense(conviction, exact)) {
      findings.push(finding(
        'federal.ccdf_permanent', 'likely_disqualified', 'federal_rule',
        'Federally assisted child-care disqualification may apply',
        'Federal law makes specified convictions and registry status disqualifying for staff of child-care providers receiving covered federal assistance. The exact offense and provider funding determine whether this rule applies.',
        'Confirm the exact statute of conviction and whether the provider is covered by 42 U.S.C. § 9858f; ask the state child-care agency about any review or relief process.',
        [ELIGIBILITY_SOURCES.childcare, ELIGIBILITY_SOURCES.licenses],
      ));
    } else if (felony && (conviction === 'drug_possession' || conviction === 'drug_distribution') && (convictionAge === null || convictionAge < 5)) {
      findings.push(finding(
        'federal.ccdf_drug_5yr', convictionAge !== null ? 'likely_disqualified' : 'license_or_agency_review', 'federal_rule',
        'Five-year child-care rule needs verification',
        'Covered child-care providers cannot employ a person with a felony drug-related offense committed during the preceding five years. Conviction date is being used only as an estimate because the offense date is not available.',
        'Verify the offense date, felony classification, provider coverage, and the state process before applying.',
        [ELIGIBILITY_SOURCES.childcare],
      ));
    } else {
      findings.push(finding(
        'state.childcare_clearance', 'license_or_agency_review', 'state_rules_vary',
        'Child-care clearance requires state verification',
        'Child-care roles require fingerprint and registry checks. State rules may add offenses or provide review processes beyond the federal baseline.',
        'Check the child-care licensing agency in the job state for the exact offense, lookback period, and any waiver process.',
        [ELIGIBILITY_SOURCES.childcare, ELIGIBILITY_SOURCES.licenses],
      ));
    }
  }

  const school = has(text, /\b(school district|public schools?|elementary school|middle school|high school campus|k-12|teacher|paraeducator|classroom aide|school bus)\b/);
  if (school && !childCare) {
    findings.push(finding(
      'state.k12_clearance', 'license_or_agency_review', 'state_rules_vary',
      'K–12 employment rules must be checked by state and role',
      'School background-check and educator-license restrictions vary by state, exact offense, duties, and time elapsed. A school setting is not treated here as a universal federal ban.',
      'Verify both the state education agency rules and the school district policy for this exact job.',
      [ELIGIBILITY_SOURCES.eeoc, ELIGIBILITY_SOURCES.licenses],
    ));
  }

  const healthcare = has(text, /\b(healthcare|health care|hospital|medical|clinic|patient|nurs(e|ing)|caregiver|home health|hospice|pharmacy)\b/);
  if (healthcare) {
    const exactFederalHealthcare = /medicare|medicaid|health care fraud|healthcare fraud|patient abuse|patient neglect/.test(exact);
    const federalDrugHealthcare = felony && conviction === 'drug_distribution' && /pharmac|prescrib|dispens|health care|healthcare|medical/.test(exact);
    if (exactFederalHealthcare || federalDrugHealthcare || candidate.currentlyExcludedFromFederalHealthcare) {
      findings.push(finding(
        'federal.hhs_oig_exclusion', candidate.currentlyExcludedFromFederalHealthcare ? 'likely_disqualified' : 'license_or_agency_review', 'federal_rule',
        'HHS-OIG exclusion status must be resolved',
        'Certain program-related crimes, patient abuse or neglect, healthcare-related financial offenses, and healthcare-related controlled-substance felonies can trigger exclusion from federally funded health programs. Exclusion is not inferred from a broad “violent” or “drug” label alone.',
        'Check the HHS-OIG LEIE and the relevant state licensing board. If an exclusion period ended, verify that formal reinstatement was granted.',
        [ELIGIBILITY_SOURCES.healthcare, ELIGIBILITY_SOURCES.leie, ELIGIBILITY_SOURCES.licenses],
      ));
    } else if (['violent_offense', 'registry_related', 'drug_distribution', 'drug_possession', 'financial_fraud', 'property_theft'].includes(conviction)) {
      findings.push(finding(
        'state.healthcare_license_review', 'license_or_agency_review', 'state_rules_vary',
        'Healthcare license and facility rules need verification',
        'There is no universal federal rule barring every person with this broad conviction category from all medical work. Direct-care access, the exact offense, state licensing law, facility type, and HHS-OIG status matter.',
        'Check the state licensing board and HHS-OIG LEIE before relying on this match, especially for direct patient care or medication access.',
        [ELIGIBILITY_SOURCES.healthcare, ELIGIBILITY_SOURCES.leie, ELIGIBILITY_SOURCES.licenses],
      ));
    }
  }

  const fdicBank = has(text, /\b(bank teller|banker|banking|fdic[- ]insured|credit union|deposit operations|loan officer)\b/);
  if (fdicBank && likelyDishonesty(conviction, exact)) {
    const agedOut = (convictionAge !== null && convictionAge >= 7) || (releaseAge !== null && releaseAge >= 5);
    findings.push(finding(
      'federal.fdic_section19', agedOut ? 'individualized_review' : 'waiver_or_approval_required', 'federal_rule',
      agedOut ? 'Older-offense exception may remove the FDIC consent requirement' : 'FDIC consent may be required',
      agedOut
        ? 'The Fair Hiring in Banking Act generally removes covered offenses from Section 19 after seven years from the offense or five years after release, subject to statutory exceptions and the exact offense.'
        : 'Section 19 can require FDIC consent for participation in an FDIC-insured institution after an offense involving dishonesty, breach of trust, or money laundering. The exact offense and newer statutory exceptions matter.',
      'Have the institution or qualified counsel apply the current Section 19 rule, including age-at-offense, de minimis, expungement, and older-offense exceptions.',
      [ELIGIBILITY_SOURCES.banking],
    ));
  }

  const finra = has(text, /\b(finra|broker[- ]dealer|registered representative|securities (broker|sales)|series (6|7|24|63|65|66|79))\b/);
  if (finra && felony && (convictionAge === null || convictionAge < 10)) {
    findings.push(finding(
      'federal.finra_10yr', 'waiver_or_approval_required', 'federal_rule',
      'FINRA statutory-disqualification process likely applies',
      'All felony convictions within ten years are statutory disqualifications for association with a FINRA member, but an eligibility proceeding can permit employment under an approved supervisory plan.',
      'Confirm the conviction date and ask the sponsoring member firm whether it will pursue a FINRA Rule 9520 eligibility application.',
      [ELIGIBILITY_SOURCES.securities],
    ));
  }

  const insurance = has(text, /\b(insurance producer|insurance agent|insurance adjuster|underwriter|claims examiner|business of insurance)\b/);
  if (insurance && felony && likelyDishonesty(conviction, exact)) {
    findings.push(finding(
      'federal.insurance_1033', 'waiver_or_approval_required', 'federal_rule',
      'Written regulatory consent may be required for insurance work',
      'Federal law restricts participation in the business of insurance after a felony involving dishonesty or breach of trust unless written consent is obtained from the appropriate insurance regulator.',
      'Ask the insurance department in the job state about its 18 U.S.C. § 1033 written-consent process before beginning regulated duties.',
      [ELIGIBILITY_SOURCES.insurance, ELIGIBILITY_SOURCES.licenses],
    ));
  }

  const commercialDriving = has(text, /\b(cdl|commercial driver|class [ab] driver|tractor[- ]trailer|truck driver|commercial motor vehicle)\b/);
  if (commercialDriving && conviction === 'dui_dwi') {
    const activeWindow = convictionAge !== null && convictionAge < 1;
    findings.push(finding(
      'federal.cdl_dui', activeWindow ? 'likely_disqualified' : 'license_or_agency_review', 'federal_rule',
      activeWindow ? 'A federal CDL disqualification period may still be active' : 'CDL status must be verified',
      'A first covered DUI generally disqualifies commercial driving for one year (three years in specified hazardous-material circumstances); a second separate offense can produce a lifetime disqualification. A DUI is not automatically a permanent bar to every driving job.',
      'Verify the current motor-vehicle record, number of qualifying incidents, vehicle type, hazmat status, and CDL reinstatement with the state licensing agency.',
      [ELIGIBILITY_SOURCES.cdl],
    ));
  }

  const airportSecure = has(text, /\b(sida|airport security clearance|unescorted (airport|secure-area) access|airport ramp|baggage handler|aircraft screening|cargo screening)\b/);
  if (airportSecure && airportListedOffense(conviction, exact, felony) && (convictionAge === null || convictionAge < 10)) {
    findings.push(finding(
      'federal.airport_10yr', 'likely_disqualified', 'federal_rule',
      'Ten-year airport secure-access restriction may apply',
      'Federal rules prohibit covered airport functions or unescorted secure-area access when a listed conviction occurred during the preceding ten years. The precise offense and conviction date control.',
      'Confirm the exact offense against 49 C.F.R. § 1544.229(d), the conviction date, and whether the job actually requires covered access.',
      [ELIGIBILITY_SOURCES.airport],
    ));
  }

  const twicHazmat = has(text, /\b(twic|transportation worker identification|hazmat endorsement|hazardous materials endorsement|hme)\b/);
  if (twicHazmat && ['weapons_related', 'drug_distribution', 'violent_offense', 'financial_fraud', 'registry_related'].includes(conviction)) {
    findings.push(finding(
      'federal.twic_hme', 'license_or_agency_review', 'federal_rule',
      'TSA security-threat assessment requires exact-offense review',
      'TWIC and hazardous-material endorsements use specific permanent and interim offense lists. Interim offenses generally use seven years from conviction or five years from release, and TSA provides appeal or waiver paths for many offenses.',
      'Compare the exact offense and dates with 49 C.F.R. § 1572.103 and verify TSA appeal/waiver eligibility.',
      [ELIGIBILITY_SOURCES.twic],
    ));
  }

  const federalOrClearance = has(text, /\b(federal agency|federal employment|usajobs|public trust|security clearance|secret clearance|top secret|ts\/sci|piv credential)\b/);
  if (federalOrClearance) {
    findings.push(finding(
      'federal.whole_person_review', 'individualized_review', 'federal_rule',
      'Federal suitability or clearance uses individualized review',
      'A criminal record is not an automatic bar to most federal jobs or a security clearance. Adjudicators consider job relevance, seriousness, circumstances, recency, rehabilitation, and the whole person, unless a position-specific statute applies.',
      'Review the posting for a specific statutory bar and prepare accurate records plus evidence of rehabilitation for the suitability process.',
      [ELIGIBILITY_SOURCES.federal, ELIGIBILITY_SOURCES.clearance],
    ));
  }

  if (findings.length === 0) {
    findings.push(finding(
      'eeoc.targeted_assessment', 'individualized_review', 'duty_relevance',
      'No occupation-specific federal bar was identified',
      'The broad offense category may still be considered by an employer, but fair screening should connect the nature of the conduct, time elapsed, and actual job duties and allow individualized assessment.',
      'Confirm state licensing rules and the employer policy; do not assume that a background check means automatic rejection.',
      [ELIGIBILITY_SOURCES.eeoc, ELIGIBILITY_SOURCES.licenses],
    ));
  }

  const highestStatus = findings.reduce<EligibilityStatus>(
    (highest, item) => STATUS_RANK[item.status] > STATUS_RANK[highest] ? item.status : highest,
    'no_occupation_specific_bar_found',
  );

  return {
    highestStatus,
    findings,
    missingFacts: [...missingFacts],
    jurisdiction: region,
    disclaimer: 'This is a screening aid, not a legal eligibility decision. Exact statutes, dates, duties, licenses, relief orders, and current agency records control.',
  };
}

export function statusScoreCap(status: EligibilityStatus): number | null {
  if (status === 'likely_disqualified') return 24;
  if (status === 'waiver_or_approval_required') return 39;
  // Do not present a regulated role as a "Possible Match" until the license
  // or agency check is resolved. The role remains visible with a path to
  // verification, but ranks in the challenging band to avoid false hope.
  if (status === 'license_or_agency_review') return 44;
  return null;
}
