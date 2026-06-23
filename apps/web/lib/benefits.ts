/**
 * Benefits screener — a no-key, rules-based estimate of which public benefits a
 * returning person likely qualifies for, computed in-app from published 2026
 * federal guidelines. There is no free public API that *determines* eligibility,
 * so this gives an honest estimate ("likely / maybe / probably not") with the
 * reason in plain language and a free link to apply — never an official decision.
 *
 * Income tests use the federal poverty level (FPL). State rules vary (many
 * states raise SNAP limits via broad-based categorical eligibility, Medicaid
 * differs in expansion vs non-expansion states), so thresholds are treated as
 * guidance with a wider "maybe" band, and every result links to the real
 * application. Pure + isomorphic.
 *
 * Source: HHS 2026 Poverty Guidelines (48 contiguous states + DC),
 * aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines.
 */

export const FPL_YEAR = 2026;
const FPL_BASE = 15_960; // 1-person annual, 48 states + DC
const FPL_ADD = 5_680;   // per additional person

/** Annual federal poverty level for a household size (48 states + DC). */
export function federalPovertyLevel(householdSize: number): number {
  const n = Math.max(1, Math.round(householdSize || 1));
  return FPL_BASE + (n - 1) * FPL_ADD;
}

export interface BenefitInput {
  householdSize: number;
  /** Money coming in each month, before taxes (gross). 0 is valid. */
  monthlyIncome: number;
  pregnantOrYoungKids?: boolean;
  seniorOrDisabled?: boolean;
  recentlyIncarcerated?: boolean;
  owesChildSupport?: boolean;
}

export type Likelihood = 'likely' | 'maybe' | 'unlikely' | 'check';

export interface BenefitResult {
  id: string;
  name: string;
  likelihood: Likelihood;
  /** Plain-language reason for the estimate. */
  reason: string;
  /** Reentry-specific note where one applies. */
  reentryNote?: string;
  apply: { label: string; url: string };
}

export const LIKELIHOOD_META: Record<Likelihood, { label: string; tone: 'good' | 'maybe' | 'low' | 'info' }> = {
  likely: { label: 'Likely a fit', tone: 'good' },
  maybe: { label: 'Maybe — worth applying', tone: 'maybe' },
  unlikely: { label: 'Less likely', tone: 'low' },
  check: { label: 'Worth a look', tone: 'info' },
};

/** Percent of the federal poverty level this household's income represents. */
export function pctOfFpl(input: BenefitInput): number {
  const annual = Math.max(0, (input.monthlyIncome || 0) * 12);
  const fpl = federalPovertyLevel(input.householdSize);
  return fpl > 0 ? Math.round((annual / fpl) * 100) : 0;
}

/**
 * Screen the major benefits. Income thresholds are federal guidance; the wide
 * "maybe" bands reflect that many states are more generous. Always links to the
 * official, free application.
 */
export function screenBenefits(input: BenefitInput): BenefitResult[] {
  const pct = pctOfFpl(input);
  const out: BenefitResult[] = [];
  const snapNote = 'Most states no longer block people with drug felonies, and some let you apply before release.';

  // ── SNAP (food) — federal gross-income test ~130% FPL; many states higher ──
  {
    const senior = !!input.seniorOrDisabled;
    let likelihood: Likelihood;
    if (pct <= 130 || (senior && pct <= 200)) likelihood = 'likely';
    else if (pct <= 200) likelihood = 'maybe';
    else likelihood = 'unlikely';
    out.push({
      id: 'snap', name: 'SNAP (food assistance)', likelihood,
      reason: likelihood === 'likely'
        ? 'Your income looks within the limit for monthly food benefits.'
        : likelihood === 'maybe'
        ? 'You may still qualify — many states allow higher income limits than the federal baseline.'
        : 'Your income is above the usual limit, but rules vary by state — it can’t hurt to check.',
      reentryNote: snapNote,
      apply: { label: 'Apply for SNAP', url: 'https://www.fns.usda.gov/snap/state-directory' },
    });
  }

  // ── Medicaid (health coverage) — expansion states cover adults to 138% FPL ──
  {
    let likelihood: Likelihood;
    if (pct <= 138) likelihood = 'likely';
    else if (pct <= 200) likelihood = 'maybe';
    else likelihood = 'unlikely';
    out.push({
      id: 'medicaid', name: 'Medicaid (free / low-cost health coverage)', likelihood,
      reason: likelihood === 'likely'
        ? 'In most states, your income qualifies for free or low-cost health coverage.'
        : likelihood === 'maybe'
        ? 'Coverage depends on your state and family situation — apply to find out.'
        : 'Your income may be above Medicaid, but you could get a low-cost Marketplace plan (below).',
      reentryNote: input.recentlyIncarcerated
        ? 'If you had Medicaid before, it was paused — not ended — during incarceration. Ask your state to turn it back on.'
        : undefined,
      apply: { label: 'Apply for Medicaid', url: 'https://www.healthcare.gov/medicaid-chip/getting-medicaid-chip/' },
    });
  }

  // ── WIC — pregnant / postpartum / kids under 5, income ≤185% FPL ──
  if (input.pregnantOrYoungKids) {
    out.push({
      id: 'wic', name: 'WIC (food & support for moms and young kids)',
      likelihood: pct <= 185 ? 'likely' : 'maybe',
      reason: 'For pregnancy, new moms, and children under 5 — food, formula, and health support.',
      apply: { label: 'Apply for WIC', url: 'https://www.fns.usda.gov/wic/apply' },
    });
  }

  // ── LIHEAP — help paying utilities (limits vary, commonly ~150% FPL) ──
  out.push({
    id: 'liheap', name: 'Help paying utility bills (LIHEAP)',
    likelihood: pct <= 150 ? 'likely' : pct <= 200 ? 'maybe' : 'check',
    reason: 'Federal help with heating, cooling, and energy bills. Limits vary by state.',
    apply: { label: 'Find LIHEAP help', url: 'https://www.acf.hhs.gov/ocs/programs/liheap' },
  });

  // ── Lifeline — discounted phone/internet (≤135% FPL, or on SNAP/Medicaid) ──
  out.push({
    id: 'lifeline', name: 'Low-cost phone & internet (Lifeline)',
    likelihood: pct <= 135 ? 'likely' : 'maybe',
    reason: 'A monthly discount on phone or internet. You also qualify automatically if you’re on SNAP or Medicaid.',
    apply: { label: 'Check Lifeline', url: 'https://www.lifelinesupport.org' },
  });

  // ── Free tax prep + EITC — money back, for workers with low/moderate income ──
  out.push({
    id: 'eitc', name: 'Free tax help (and money back)',
    likelihood: 'check',
    reason: 'If you worked at all, you may be owed a refund through the Earned Income Tax Credit. Free help to claim it.',
    apply: { label: 'Find free tax help', url: 'https://www.irs.gov/individuals/irs-free-tax-return-preparation-programs' },
  });

  // ── Marketplace subsidies — above Medicaid but still low/moderate income ──
  if (pct > 138 && pct <= 400) {
    out.push({
      id: 'aca', name: 'Low-cost health plan (Marketplace)',
      likelihood: 'maybe',
      reason: 'Above Medicaid but still eligible for big discounts on a health plan.',
      apply: { label: 'See Marketplace plans', url: 'https://www.healthcare.gov' },
    });
  }

  // ── Child support modification — not income-based; for those who owe ──
  if (input.owesChildSupport) {
    out.push({
      id: 'childsupport', name: 'Lower your child support payments',
      likelihood: 'check',
      reason: 'You can ask to change what you owe to an amount you can actually afford — especially after release.',
      reentryNote: 'Unpayable debt helps no one. A realistic, lowered payment keeps you out of trouble and supports your kids.',
      apply: { label: 'Find your child support office', url: 'https://www.acf.gov/css/contact-information/parents' },
    });
  }

  // Surface the strongest fits first.
  const rank: Record<Likelihood, number> = { likely: 0, maybe: 1, check: 2, unlikely: 3 };
  return out.sort((a, b) => rank[a.likelihood] - rank[b.likelihood]);
}
