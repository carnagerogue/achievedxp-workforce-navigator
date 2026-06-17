import { Injectable, Logger } from '@nestjs/common';
import { RiskTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ClassificationInput {
  title: string;
  description: string;
  industry?: string | null;
  /** Employer name. Critical for federal-suitability detection — many
   *  postings don't say "no felons" in the text but the employer (military,
   *  Bureau of Prisons, FBI, etc.) effectively bars felony records via OPM
   *  suitability determinations, security clearances, or moral-character
   *  waivers. Treating these as "second-chance friendly" is dangerous. */
  company?: string | null;
}

export interface ClassificationOutput {
  industry: string | null;
  riskTier: RiskTier;
  backgroundCheckLikely: boolean;
  excludesFelons: boolean;
  isApprenticeship: boolean;
}

/**
 * Deterministic, keyword-based job classifier.
 *
 * Phase 5's NLP enrichment will run *on top of* this — it'll refine skills
 * and requirements, but the fundamental tags (industry, risk tier,
 * background-check likelihood, felon exclusion) stay rule-based and auditable.
 * That keeps the matching engine's behaviour explainable to a caseworker,
 * which matters more here than a marginal accuracy lift.
 */
@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);

  // Industry keyword map — ordered by specificity. First match wins.
  private readonly industryRules: ReadonlyArray<[string, readonly string[]]> = [
    ['transportation', ['cdl', 'truck driver', 'delivery driver', 'trucking', 'dispatcher', 'chauffeur']],
    ['warehousing',    ['warehouse', 'forklift', 'logistics', 'distribution center', 'material handler', 'picker packer']],
    ['construction',   ['construction', 'carpenter', 'welder', 'welding', 'hvac', 'electrician', 'plumber', 'roofer', 'mason', 'drywall', 'journeyman']],
    ['food_service',   ['line cook', 'dishwasher', 'prep cook', 'barista', 'server', 'busser', 'kitchen staff', 'restaurant', 'cafeteria']],
    ['security',       ['security guard', 'armored', 'surveillance', 'loss prevention', 'protective services']],
    ['education',      ['school bus', 'teacher', 'teaching assistant', 'tutor', 'paraeducator']],
    ['healthcare',     ['nurse', 'medical assistant', 'caregiver', 'home health', 'phlebotomist', 'ekg tech']],
    ['services',       ['customer service', 'call center', 'retail associate', 'sales associate', 'receptionist']],
    ['manufacturing',  ['assembly line', 'machine operator', 'production worker', 'manufacturing']],
    ['cleaning',       ['janitor', 'custodian', 'housekeep', 'cleaning crew']],
  ];

  // Industries that almost always involve heightened background scrutiny.
  private readonly highRiskIndustries = new Set([
    'security', 'education', 'healthcare', 'childcare', 'finance',
  ]);

  // Industries where second-chance hiring is well-established.
  private readonly lowRiskIndustries = new Set([
    'construction', 'warehousing', 'food_service', 'cleaning', 'manufacturing',
  ]);

  // ─────────── Federal-suitability employer / role detection ───────────
  //
  // Truth-in-product rule: if the employer is a U.S. military branch, a
  // federal law-enforcement agency, the federal corrections system, or
  // any role that requires a security clearance, we flag the posting as
  // excluding felony records — even if the posting text doesn't say so
  // explicitly. The OPM 5 CFR 731 suitability determination, Common
  // Access Card screening, and DoD security clearance adjudication
  // standards all treat felony convictions as serious adverse factors.
  // Showing these as "second-chance friendly" misleads the candidate.

  /**
   * Military branches + DoD components (active, guard, reserve), and any
   * federal employer based on a military installation. Matched only against
   * employer name + title (NOT description) so "navy blue uniform" in a
   * posting can't false-positive a job at e.g. McDonald's.
   *
   * Why this is conservative: every federal civilian on a military
   * installation needs an HSPD-12 PIV/CAC card, which requires favorable
   * suitability. Felony convictions are typically disqualifying. So even a
   * line cook at "Commander, Navy Installations Command" gets flagged.
   */
  private readonly militaryEmployerPatterns: RegExp[] = [
    // Branch names — match standalone too, since employer fields often omit
    // "U.S." (e.g. "Navy Installations Command", "Army Installation Mgmt").
    /\bU\.?\s?S\.?\s?Army\b/i,
    /\bArmy\s+(National Guard|Reserve|Installation|Materiel|Corps of Engineers|Medical|Sustainment|Cyber|Futures|Forces|Recruiting)\b/i,
    /\bArmy National Guard\b/i,
    /\bU\.?\s?S\.?\s?Navy\b/i,
    /\bNavy\s+(Installations?|Reserve|Exchange|Recruiting|Region|Operational|Medicine)\b/i,
    /\bNaval\s+(Air|Sea|Surface|Special|Information|Installations|Education|Hospital|Medical|Station|Base|Submarine|Supply|Reserve|Computer)\b/i,
    /\bU\.?\s?S\.?\s?Air Force\b/i,
    /\bAir Force\s+(Reserve|Materiel|Global|Special|Medical|Recruiting|Civil Engineer|Personnel)\b/i,
    /\bUSAF\b/,
    /\bAir National Guard\b/i,
    /\bMarine Corps\b/i,
    /\bU\.?\s?S\.?\s?Marines\b/i,
    /\bCoast Guard\b/i,
    /\bSpace Force\b/i,
    /\bPacific Air Forces\b/i,
    /\bAir Combat Command\b/i,
    /\bAir Force Materiel Command\b/i,
    // Generic military commander phrasing — e.g. "Commander, Navy Installations Command"
    /\bCommander,?\s+(Navy|Naval|Army|Air Force|Marine|Coast Guard|Submarine|Fleet|Pacific|Atlantic|U\.?S\.?)\b/i,
    // Department of Defense / DoD components.
    /\bDepartment of (Defense|the Army|the Navy|the Air Force)\b/i,
    /\bDoD\b/,
    /\bDefense (Logistics|Commissary|Finance|Information Systems|Intelligence|Health|Contract|Counterintelligence|Threat Reduction|Human Resources|Media|Manpower)\b/i,
    /\bDefense\s+POW\/MIA\b/i,
    /\bMissile Defense Agency\b/i,
    /\bPentagon\b/i,
    /\bU\.?\s?S\.?\s?Forces\b/i, // e.g. "U.S. Forces, Korea/Japan/Europe"
    /\bMilitary Sealift Command\b/i,
    /\bMilitary Entrance Processing\b/i,
    // Installation patterns — anyone working ON a military base needs PIV
    // and a favorable suitability decision.
    /\bJoint Base\b/i,
    /\bAir Force Base\b/i,
    /\bAFB\b/,
    /\bNaval (Air )?Station\b/i,
    /\bNaval Base\b/i,
    /\bNaval Submarine Base\b/i,
    /\bNaval Air Facility\b/i,
    /\bMarine Corps (Air Station|Base|Logistics)\b/i,
    /\bMCAS\b/,
    /\bMCB Camp\b/i,
    // Fort Bragg, Fort Hood, Fort Bliss, etc. — but NOT civilian metros that
    // merely sit in a "Fort" city (Fort Worth, Fort Collins, Fort Lauderdale,
    // Fort Myers, Fort Wayne, Fort Smith, …), which would wrongly flag
    // ordinary employers there as federal/military.
    /\bFort\s+(?!Worth|Collins|Lauderdale|Myers|Wayne|Smith|Pierce|Dodge|Walton|Mill|Madison)[A-Z][a-zA-Z]+/,
    /\bCamp\s+(Pendleton|Lejeune|Geiger|Foster|Hansen|Schwab|Courtney|Casey|Humphreys|Carroll|Walker|Zama)\b/i,
    /\bSchofield Barracks\b/i,
    /\bPearl Harbor\b/i,
    /\bWest Point\b/i,
    /\bUnited States Military Academy\b/i,
    /\bArlington National Cemetery\b/i,
  ];

  /** Federal law enforcement, corrections, and intelligence agencies. */
  private readonly federalLawEnforcementPatterns: RegExp[] = [
    /\bBureau of Prisons\b/i,
    /\bFederal (Prison|Penitentiary|Correctional)\b/i,
    /\bU\.?\s?S\.?\s?Marshals?\b/i,
    /\b(U\.?\s?S\.?\s?)?Secret Service\b/i,
    /\bFederal Bureau of Investigation\b/i,
    /\bFBI\b/,
    /\bDrug Enforcement Administration\b/i,
    /\bAlcohol,?\s?Tobacco\b/i,
    /\bU\.?\s?S\.?\s?Customs\b/i,
    /\bCustoms and Border\b/i,
    /\bBorder Patrol\b/i,
    /\bImmigration and Customs Enforcement\b/i,
    /\bTransportation Security Administration\b/i,
    /\b(Federal )?Air Marshals?\b/i,
    /\bCapitol Police\b/i,
    /\bFederal Law Enforcement\b/i,
    /\bFederal Protective Service\b/i,
    /\bDiplomatic Security\b/i,
    /\bBureau of Diplomatic Security\b/i,
    // Intelligence community
    /\bCentral Intelligence Agency\b/i,
    /\bNational Security Agency\b/i,
    /\bNational Geospatial-Intelligence\b/i,
    /\bNational Reconnaissance Office\b/i,
  ];

  /** Federal courts and probation. */
  private readonly federalCourtsPatterns: RegExp[] = [
    /\bU\.?\s?S\.?\s?Courts\b/i,
    /\bUnited States Courts\b/i,
    /\bU\.?\s?S\.?\s?District Court\b/i,
    /\bU\.?\s?S\.?\s?Probation\b/i,
    /\bAdministrative Office of the U\.?\s?S\.?\s?Courts\b/i,
  ];

  /**
   * Job-title patterns that almost always disqualify felony records,
   * regardless of employer (e.g., a "Police Officer" anywhere fails
   * Lautenberg + standard moral-character checks).
   */
  private readonly restrictedTitlePatterns: RegExp[] = [
    /\bpolice officer\b/i,
    /\bspecial agent\b/i,
    /\bcriminal investigator\b/i,
    /\bcorrectional? officer\b/i,
    /\bdetention officer\b/i,
    /\bborder patrol agent\b/i,
    /\bintelligence (analyst|specialist|officer)\b/i,
    /\bdeputy (sheriff|marshal|u\.?s\.? marshal)\b/i,
    /\bpolygraph examiner\b/i,
    /\bATF agent\b/i,
    /\bFBI special agent\b/i,
    /\bDEA special agent\b/i,
    /\bsworn law enforcement\b/i,
    /\bfirearms (instructor|examiner)\b/i,
  ];

  /** Description signals indicating a security clearance is required. */
  private readonly clearanceRequiredPatterns: RegExp[] = [
    /\b(top secret|TS\/SCI|TS-SCI)\b/i,
    /\bsecret clearance\b/i,
    /\bsecurity clearance\b/i,
    /\bSF-?86\b/i,
    /\bsuitability determination\b/i,
    /\bbackground investigation\b/i,
    /\bpolygraph (examination|required|test)\b/i,
    /\bmoral character\b/i,
    /\bcommon access card\b/i,
    /\bCAC\s+(card|eligibility)\b/i,
  ];

  // Text signatures that flag a posting as an apprenticeship / registered
  // training program. These roles are especially valuable for fair-chance
  // candidates — they pay while training, often avoid background-check
  // gates, and lead to union-scale employment.
  private readonly apprenticeshipPatterns: RegExp[] = [
    /\bapprentice(ship)?s?\b/i,
    /\bpre[- ]apprenticeship\b/i,
    /\bregistered[- ]apprenticeship\b/i,
    /\bjourneyman\b/i,
    /\bearn[- ]while[- ]you[- ]learn\b/i,
    /\bibew\b/i,                        // electrical union
    /\bua\s+local\s+\d+/i,              // plumbing / pipefitting
    /\blaborers[- ]local\b/i,
    /\bunion[- ]training\b/i,
    /\bon[- ]the[- ]job\s+training\b/i, // OJT
  ];

  // Text signatures that imply the employer will run a background check.
  private readonly backgroundCheckPhrases = [
    'background check', 'criminal history check', 'must pass a background',
    'drug test', 'e-verify', 'pre-employment screening',
  ];

  // Text signatures that indicate the employer excludes felony records.
  // We require a fairly explicit phrase — "no felonies", "clean record",
  // "felony conviction disqualif…" — to avoid over-filtering. False
  // negatives are recoverable (user sees the job, filters themselves);
  // false positives hide legitimate matches, which is the harm we want to
  // minimize.
  private readonly excludesFelonsPhrases = [
    'no felon',
    'no felony',
    'no felonies',
    'felony conviction disqualif',
    'felony convictions disqualif',
    'clean criminal record',
    'clean record required',
    'must have clean record',
    'cannot have a felony',
    'cannot have felony',
    'cannot have any felony',
    'no criminal history',
    'no criminal record',
  ];

  constructor(private readonly prisma: PrismaService) {}

  classify(input: ClassificationInput): ClassificationOutput {
    const text = `${input.title}\n${input.description}`.toLowerCase();
    const company = input.company ?? '';
    const titlePlusCompany = `${company}\n${input.title}`;
    const allText = `${company}\n${input.title}\n${input.description}`;

    const industry = input.industry ?? this.detectIndustry(text);

    // Federal-suitability detection runs FIRST so the override below can't
    // be quietly contradicted by industry-based heuristics. Conservative by
    // design: if any signal trips, treat the role as high-scrutiny + felon-
    // excluding. The cost of a false positive (we hide one accessible job)
    // is small; the cost of a false negative (we tell someone with a record
    // they're a great fit for an FBI Special Agent role) is enormous.
    const isMilitary       = this.matchesAny(this.militaryEmployerPatterns,         titlePlusCompany);
    const isFederalLE      = this.matchesAny(this.federalLawEnforcementPatterns,    titlePlusCompany);
    const isFederalCourts  = this.matchesAny(this.federalCourtsPatterns,            titlePlusCompany);
    const isRestrictedRole = this.matchesAny(this.restrictedTitlePatterns,          input.title);
    const requiresClearance = this.matchesAny(this.clearanceRequiredPatterns,        allText);

    const federalSuitability = isMilitary || isFederalLE || isFederalCourts || isRestrictedRole || requiresClearance;

    let riskTier              = this.detectRiskTier(industry, text);
    let backgroundCheckLikely = this.detectBackgroundCheck(text, riskTier);
    let excludesFelons        = this.detectExcludesFelons(text);

    if (federalSuitability) {
      riskTier              = RiskTier.HIGH;
      backgroundCheckLikely = true;
      excludesFelons        = true;
    }

    const isApprenticeship = this.detectApprenticeship(input.title, input.description);

    return { industry, riskTier, backgroundCheckLikely, excludesFelons, isApprenticeship };
  }

  private matchesAny(patterns: ReadonlyArray<RegExp>, text: string): boolean {
    return patterns.some((re) => re.test(text));
  }

  private detectApprenticeship(title: string, description: string): boolean {
    const both = `${title}\n${description}`;
    return this.apprenticeshipPatterns.some((re) => re.test(both));
  }

  private detectIndustry(text: string): string | null {
    for (const [industry, keywords] of this.industryRules) {
      if (keywords.some((k) => text.includes(k))) return industry;
    }
    return null;
  }

  private detectRiskTier(industry: string | null, text: string): RiskTier {
    if (industry && this.highRiskIndustries.has(industry)) return RiskTier.HIGH;
    if (industry && this.lowRiskIndustries.has(industry))  return RiskTier.LOW;

    // Title/desc fallback — some roles are high-risk regardless of industry tag.
    if (/\b(armored|firearm|armed|bank teller|cash handling)\b/.test(text)) return RiskTier.HIGH;
    if (/\b(childcare|daycare|minors?)\b/.test(text))                        return RiskTier.HIGH;

    return RiskTier.MEDIUM;
  }

  private detectBackgroundCheck(text: string, riskTier: RiskTier): boolean {
    if (this.backgroundCheckPhrases.some((p) => text.includes(p))) return true;
    // High-risk industries default to assuming a check even if not stated.
    if (riskTier === RiskTier.HIGH) return true;
    return false;
  }

  private detectExcludesFelons(text: string): boolean {
    return this.excludesFelonsPhrases.some((p) => text.includes(p));
  }

  /**
   * Reclassify every canonical job. Used as a one-shot backfill after
   * classifier rule changes. Safe to run repeatedly — writes are idempotent.
   */
  async backfillAll(): Promise<{ updated: number }> {
    const batchSize = 200;
    let skip = 0;
    let updated = 0;

    for (;;) {
      const batch = await this.prisma.job.findMany({
        orderBy: { createdAt: 'asc' },
        take: batchSize,
        skip,
        select: { id: true, title: true, description: true, industry: true, company: true },
      });
      if (batch.length === 0) break;

      for (const job of batch) {
        const c = this.classify({
          title: job.title,
          description: job.description,
          industry: job.industry,
          company: job.company,
        });
        await this.prisma.job.update({
          where: { id: job.id },
          data: {
            industry: c.industry,
            riskTier: c.riskTier,
            backgroundCheckLikely: c.backgroundCheckLikely,
            excludesFelons: c.excludesFelons,
            isApprenticeship: c.isApprenticeship,
          },
        });
        updated++;
      }
      skip += batch.length;
    }

    this.logger.log(`Classifier backfill complete: ${updated} jobs updated`);
    return { updated };
  }
}
