import { Injectable } from '@nestjs/common';
import { Conviction, RiskTier } from '@prisma/client';
import {
  Scorer,
  ScoringContext,
  ScoreResult,
  ScoreBreakdown,
  WEIGHTS,
} from './scorer.types';
import { OFFENSE_FILTER_RULES } from './offense-filters';

function yearsSinceRelease(convictions: Conviction[]): number | null {
  const releases = convictions
    .map((c) => c.releaseYear)
    .filter((y): y is number => typeof y === 'number');
  if (releases.length === 0) return null;
  const mostRecent = Math.max(...releases);
  return Math.max(0, new Date().getFullYear() - mostRecent);
}

/**
 * Rule-based scorer — Phase 2 V1.
 *
 * Two stages:
 *   (1) Hard filters → if any legal restriction applies, emit disqualified=true
 *       with a human-readable reason. The job will appear only in "Jobs to
 *       Avoid". A partial score is still computed for transparency.
 *   (2) Weighted component scoring (see WEIGHTS) → integer 0..100.
 *
 * Design intent: every decision is auditable by a caseworker. No probabilistic
 * fuzz, no opaque ML signals. Phase 5 may layer NLP enrichment on top, but
 * the rule scorer remains the floor the system can always fall back to.
 */
@Injectable()
export class RuleScorer implements Scorer {
  score(ctx: ScoringContext): ScoreResult {
    const disqualificationReasons = this.computeHardFilters(ctx);
    const breakdown = this.computeBreakdown(ctx);

    const rawScore =
      breakdown.industry +
      breakdown.skills +
      breakdown.certifications +
      breakdown.experience +
      breakdown.location +
      breakdown.risk;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    const explanation = this.buildExplanation(ctx, breakdown);

    return {
      score,
      breakdown,
      explanation,
      disqualified: disqualificationReasons.length > 0,
      disqualificationReasons,
    };
  }

  // ───────────────────────── Hard filters ─────────────────────────

  private computeHardFilters({ profile, convictions, job }: ScoringContext): string[] {
    const reasons: string[] = [];

    // --- Authoritative "has felony" signal ---
    // Prefer structured convictions; fall back to the flat profile flag when
    // the user hasn't filled out the detailed form yet.
    const hasFelony = convictions.some((c) => c.category === 'FELONY') || profile.hasFelonyRecord;

    // --- 1. Employer-stated exclusion ---
    // The classifier flips `excludesFelons=true` either when the posting
    // text says so explicitly OR when the employer is military / federal LE
    // / federal courts / a clearance-gated role. We pick the more specific
    // reason here so the candidate understands *why* this is on the avoid
    // list — federal suitability is a different problem than a private
    // employer's policy.
    if (job.excludesFelons && hasFelony) {
      const isFederal = this.isFederalSuitabilityEmployer(job);
      reasons.push(
        isFederal
          ? 'Federal suitability / security clearance required — felony convictions are typically disqualifying under OPM 5 CFR 731.'
          : 'This employer states a clean record is required.',
      );
    }

    // --- 2. User-declared restricted industry (parole/probation condition) ---
    if (
      profile.restrictedIndustries.length > 0 &&
      job.industry &&
      profile.restrictedIndustries.includes(job.industry)
    ) {
      reasons.push(
        `Your profile lists "${job.industry}" as a restricted industry (parole/probation condition).`,
      );
    }

    // --- 3. Per-conviction × industry bars (sex offense, fraud, DUI, weapons) ---
    const jobTitleLower = job.title.toLowerCase();
    for (const c of convictions) {
      for (const rule of OFFENSE_FILTER_RULES) {
        if (!rule.matchConviction(c)) continue;

        const industryHit = job.industry !== null && rule.blocksIndustry.has(job.industry);
        const titleHit    = rule.blocksTitleKeyword.some((k) => jobTitleLower.includes(k));
        if (industryHit || titleHit) {
          if (!reasons.includes(rule.reason)) reasons.push(rule.reason);
        }
      }
    }

    // --- 4. Currently incarcerated → only pre-release-flagged roles would fit.
    // We don't tag those yet, so treat all roles as inaccessible for now.
    if (convictions.some((c) => c.currentlyIncarcerated)) {
      reasons.push(
        'Currently incarcerated — only pre-release-certified employers are viable until release.',
      );
    }

    // --- 5. Recently released + high-risk + background check ---
    // Use authoritative `yearsSinceRelease` from convictions when available.
    const yrs = yearsSinceRelease(convictions) ?? profile.yearsSinceRelease ?? 0;
    if (
      hasFelony &&
      job.riskTier === RiskTier.HIGH &&
      job.backgroundCheckLikely &&
      yrs < 5
    ) {
      reasons.push(
        'High-scrutiny role with a background check — likely to deny given recent release date.',
      );
    }

    return reasons;
  }

  // ───────────────────────── Breakdown ─────────────────────────

  private computeBreakdown({ profile, convictions, job }: ScoringContext): ScoreBreakdown {
    const hasFelony = convictions.some((c) => c.category === 'FELONY') || profile.hasFelonyRecord;
    const yrs = yearsSinceRelease(convictions) ?? profile.yearsSinceRelease ?? null;

    return {
      industry:       this.scoreIndustry(profile, job),
      skills:         this.scoreSkills(profile, job),
      certifications: this.scoreCertifications(profile, job),
      experience:     this.scoreExperience(profile, job),
      location:       this.scoreLocation(profile, job),
      risk:           this.scoreRisk({ hasFelony, yearsSinceRelease: yrs }, job),
    };
  }

  private scoreIndustry(
    profile: {
      desiredIndustries: string[];
      riasecRealistic:     number | null;
      riasecInvestigative: number | null;
      riasecArtistic:      number | null;
      riasecSocial:        number | null;
      riasecEnterprising:  number | null;
      riasecConventional:  number | null;
    },
    job: { industry: string | null },
  ): number {
    if (!job.industry) return Math.round(WEIGHTS.industry * 0.4); // unknown → neutral

    const explicit = profile.desiredIndustries.includes(job.industry);
    if (profile.desiredIndustries.length === 0) {
      // No explicit preferences: default partial credit, bumped up if the
      // user has completed the interest assessment AND this industry aligns
      // with their top RIASEC dimensions. Caps at the base weight.
      const base = Math.round(WEIGHTS.industry * 0.5);
      const bonus = this.riasecAlignmentBonus(profile, job.industry);
      return Math.min(WEIGHTS.industry, base + bonus);
    }

    if (explicit) return WEIGHTS.industry;

    // Industry not explicitly wanted, but interest profile suggests it
    // might still fit — give partial credit so exploratory matches surface.
    const bonus = this.riasecAlignmentBonus(profile, job.industry);
    return Math.min(WEIGHTS.industry, bonus);
  }

  /**
   * Is this job's `excludesFelons=true` flag the result of a federal-
   * suitability employer/role rather than the employer's own posting text?
   * Used to phrase the Avoid-card reason more precisely.
   *
   * The classifier sets this flag based on company name + title. We mirror
   * the same regexes here so the explanation matches the classifier's
   * reasoning.
   */
  private isFederalSuitabilityEmployer(job: { company: string; title: string }): boolean {
    const both = `${job.company}\n${job.title}`;
    return /(\bU\.?\s?S\.?\s?(Army|Navy|Air Force|Marines?|Coast Guard|Marshals?)\b|\bArmy National Guard\b|\bArmy Reserve\b|\bNaval (Air|Sea|Surface|Special|Information|Installations|Education)\b|\bMarine Corps\b|\bSpace Force\b|\bPacific Air Forces\b|\bDepartment of Defense\b|\bDefense (Logistics|Commissary|Finance|Information|Intelligence) (Agency|Service|Systems)\b|\bMissile Defense Agency\b|\bPentagon\b|\bBureau of Prisons\b|\bFederal (Prison|Penitentiary|Correctional|Bureau of Investigation|Protective Service|Law Enforcement)\b|\bSecret Service\b|\bFBI\b|\bDrug Enforcement Administration\b|\bAlcohol,?\s?Tobacco\b|\bU\.?\s?S\.?\s?Customs\b|\bCustoms and Border\b|\bBorder Patrol\b|\bImmigration and Customs Enforcement\b|\bTransportation Security Administration\b|\b(Federal )?Air Marshals?\b|\bCapitol Police\b|\bU\.?\s?S\.?\s?Courts\b|\bUnited States Courts\b|\bU\.?\s?S\.?\s?Probation\b|\bCentral Intelligence Agency\b|\bNational Security Agency\b|\bpolice officer|\bspecial agent|\bcriminal investigator|\bcorrectional? officer|\bborder patrol agent|\bdeputy (sheriff|marshal))/i.test(both);
  }

  /**
   * RIASEC alignment bonus: 0–8 points, proportional to the sum of the
   * user's top-2 dimension scores that map to this industry.
   *
   * Deliberately small so the interest profiler is a soft nudge, never a
   * hard filter. A user who hasn't taken the assessment pays nothing.
   */
  private riasecAlignmentBonus(
    profile: {
      riasecRealistic:     number | null;
      riasecInvestigative: number | null;
      riasecArtistic:      number | null;
      riasecSocial:        number | null;
      riasecEnterprising:  number | null;
      riasecConventional:  number | null;
    },
    industry: string,
  ): number {
    const scores = {
      R: profile.riasecRealistic     ?? 0,
      I: profile.riasecInvestigative ?? 0,
      A: profile.riasecArtistic      ?? 0,
      S: profile.riasecSocial        ?? 0,
      E: profile.riasecEnterprising  ?? 0,
      C: profile.riasecConventional  ?? 0,
    };
    const total = scores.R + scores.I + scores.A + scores.S + scores.E + scores.C;
    if (total === 0) return 0; // assessment not completed → no bonus

    // Industries → RIASEC dimensions (inverse of RIASEC_TO_INDUSTRIES).
    const industryToDims: Record<string, ReadonlyArray<keyof typeof scores>> = {
      construction:   ['R'],
      warehousing:    ['R', 'C'],
      transportation: ['R'],
      manufacturing:  ['R'],
      cleaning:       ['R'],
      healthcare:     ['I', 'S'],
      services:       ['I', 'A', 'S', 'E', 'C'],
      education:      ['S'],
      food_service:   ['S', 'E'],
      security:       [],
    };
    const dims = industryToDims[industry] ?? [];
    if (dims.length === 0) return 0;

    // Sum matching dimension scores, normalize against the theoretical max
    // of a full 25-point score on each dim, and scale to an 8-point cap.
    const matched = dims.reduce((sum, d) => sum + scores[d], 0);
    const maxPossible = dims.length * 25;
    return Math.round((matched / maxPossible) * 8);
  }

  private scoreSkills(
    profile: { skills: string[] },
    job: { requiredSkills: string[] },
  ): number {
    if (job.requiredSkills.length === 0) return Math.round(WEIGHTS.skills * 0.5);
    const matches = job.requiredSkills.filter((s) => profile.skills.includes(s)).length;
    const ratio = matches / job.requiredSkills.length;
    return Math.round(WEIGHTS.skills * ratio);
  }

  private scoreCertifications(
    profile: { certifications: string[] },
    job: { requiredCertifications: string[] },
  ): number {
    // No required certs = no barrier = full credit. This matches reality:
    // a warehouse role with zero cert requirements shouldn't be penalised
    // against one requiring forklift + OSHA 10.
    if (job.requiredCertifications.length === 0) return WEIGHTS.certifications;
    const matches = job.requiredCertifications.filter((c) =>
      profile.certifications.includes(c),
    ).length;
    const ratio = matches / job.requiredCertifications.length;
    return Math.round(WEIGHTS.certifications * ratio);
  }

  private scoreExperience(
    profile: { yearsExperience: number },
    job: { minYearsExperience: number | null },
  ): number {
    const required = job.minYearsExperience ?? 0;
    if (required === 0) return WEIGHTS.experience;
    const userYears = profile.yearsExperience;
    if (userYears >= required) return WEIGHTS.experience;
    // Linear scale — someone with 1yr vs a 2yr requirement still gets
    // half credit, which keeps them in the pool for stretch opportunities.
    return Math.round(WEIGHTS.experience * (userYears / required));
  }

  private scoreLocation(
    profile: {
      locationRegion: string | null;
      locationPostalCode: string | null;
      willingToRelocate: boolean;
      hasTransportation: boolean;
    },
    job: { locationRegion: string | null; locationPostalCode: string | null; remote: boolean },
  ): number {
    if (job.remote) return WEIGHTS.location;

    // Exact ZIP match — highest signal, overrides region logic.
    if (
      profile.locationPostalCode &&
      job.locationPostalCode &&
      profile.locationPostalCode === job.locationPostalCode
    ) {
      return WEIGHTS.location;
    }

    if (!profile.locationRegion || !job.locationRegion) {
      return Math.round(WEIGHTS.location * 0.5);
    }
    if (profile.locationRegion === job.locationRegion) {
      // Same region, different ZIP — strong but not perfect.
      return Math.round(WEIGHTS.location * 0.8);
    }
    if (profile.willingToRelocate) return Math.round(WEIGHTS.location * 0.5);
    // Different region + not willing to relocate + no transport signal → 0.
    return 0;
  }

  private scoreRisk(
    ctx: { hasFelony: boolean; yearsSinceRelease: number | null },
    job: { riskTier: RiskTier; backgroundCheckLikely: boolean },
  ): number {
    // Low-risk roles are the safest bets for justice-impacted candidates.
    if (job.riskTier === RiskTier.LOW) return WEIGHTS.risk;
    if (job.riskTier === RiskTier.MEDIUM) return Math.round(WEIGHTS.risk * 0.7);

    // HIGH: depends entirely on whether a background check is the blocker.
    if (!job.backgroundCheckLikely) return Math.round(WEIGHTS.risk * 0.5);
    if (!ctx.hasFelony)             return Math.round(WEIGHTS.risk * 0.5);

    // Felony + high-risk + BG check. The hard filter above already cuts
    // recent releases; >=5 years gets partial credit — still viable.
    const yrs = ctx.yearsSinceRelease ?? 0;
    if (yrs >= 10) return Math.round(WEIGHTS.risk * 0.5);
    if (yrs >= 5)  return Math.round(WEIGHTS.risk * 0.3);
    return 0;
  }

  // ───────────────────────── Explanation ─────────────────────────

  private buildExplanation(ctx: ScoringContext, b: ScoreBreakdown): string {
    const { profile, job } = ctx;
    const parts: string[] = [];

    if (job.industry && profile.desiredIndustries.includes(job.industry)) {
      parts.push(`${job.industry.replace('_', ' ')} matches your target industries`);
    } else if (job.industry) {
      parts.push(`industry "${job.industry.replace('_', ' ')}" isn't on your target list`);
    }

    if (job.requiredSkills.length > 0) {
      const matched = job.requiredSkills.filter((s) => profile.skills.includes(s));
      if (matched.length === job.requiredSkills.length) {
        parts.push('all required skills present');
      } else if (matched.length > 0) {
        parts.push(`${matched.length} of ${job.requiredSkills.length} required skills present`);
      } else {
        parts.push('none of the required skills are on your profile');
      }
    }

    if (job.requiredCertifications.length > 0) {
      const matched = job.requiredCertifications.filter((c) => profile.certifications.includes(c));
      if (matched.length === job.requiredCertifications.length) {
        parts.push('certifications met');
      } else {
        parts.push(`missing ${job.requiredCertifications.length - matched.length} required certification(s)`);
      }
    }

    const req = job.minYearsExperience ?? 0;
    if (req > 0) {
      if (profile.yearsExperience >= req) parts.push(`${profile.yearsExperience}y experience meets ${req}y requirement`);
      else parts.push(`${profile.yearsExperience}y experience vs ${req}y required`);
    }

    if (job.remote) {
      parts.push('remote role');
    } else if (job.locationRegion && profile.locationRegion === job.locationRegion) {
      parts.push(`located in your region (${job.locationRegion})`);
    } else if (job.locationRegion && profile.locationRegion !== job.locationRegion) {
      parts.push(profile.willingToRelocate
        ? `in ${job.locationRegion} (you're open to relocation)`
        : `in ${job.locationRegion} — outside your region`);
    }

    if (job.riskTier === RiskTier.LOW) {
      parts.push('second-chance-friendly industry');
    } else if (job.riskTier === RiskTier.HIGH && job.backgroundCheckLikely) {
      parts.push('high background-check scrutiny expected');
    }

    // Fallback if nothing else was generated (e.g., no industry, no skills,
    // no certs, no experience, no location). Rare, but possible.
    if (parts.length === 0) parts.push('partial match based on available profile data');

    return parts.join('; ') + '.';
  }
}
