'use client';

import { useEffect, useState } from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
import { getCosWages, type CosWageArea, type CosWagesResponse } from '../lib/api';

/**
 * BLS percentile wages for the role + state.
 *
 * Adds market context next to the posted salary on a job detail page so
 * the candidate can tell whether the offered comp is in the bottom
 * quartile, around median, or premium for the area. Especially useful
 * when the listing has no salary band.
 *
 * The COS wage endpoint accepts either an O*NET code or a free-text
 * keyword. We pass the job title — COS does fuzzy occupation matching.
 */
interface Props {
  /** Job title or O*NET code; CareerOneStop accepts either. */
  keyword: string;
  /** USPS state code, e.g. "OH". Falls back to national if null. */
  locationRegion: string | null;
  /** Posted salary band from the job — used as comparison anchor. */
  postedSalaryMin: number | null;
  postedSalaryMax: number | null;
}

export function JobWagesPanel({ keyword, locationRegion, postedSalaryMin, postedSalaryMax }: Props) {
  const [data, setData] = useState<CosWagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keyword) return;
    setLoading(true);
    setError(null);
    getCosWages(keyword, locationRegion ?? undefined)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [keyword, locationRegion]);

  // Pull the most-specific area available — prefer state, fall back to nation.
  const area = pickBestArea(data, locationRegion);

  // No data, no panel — keeps the detail page clean for jobs we couldn't match.
  if (!loading && !error && !area) return null;

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
        <Wallet className="h-5 w-5 text-teal-600" /> Wage benchmark
        {area?.AreaName && <span className="text-xs font-normal text-slate-500">· {area.AreaName}</span>}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Bureau of Labor Statistics percentile wages for this occupation, via the
        U.S. Department of Labor's CareerOneStop. Compare against the posted band
        before negotiating.
      </p>

      {loading && <div className="mt-4 h-24 rounded-xl bg-slate-100" />}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Could not load wage data: {error}</span>
        </div>
      )}

      {area && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="10th %ile"  value={fmtMoney(area.Pct10, area.RateType)} tone="slate" />
            <Stat label="25th %ile"  value={fmtMoney(area.Pct25, area.RateType)} tone="slate" />
            <Stat label="Median"     value={fmtMoney(area.Median, area.RateType)} tone="teal" emphasis />
            <Stat label="75th %ile"  value={fmtMoney(area.Pct75, area.RateType)} tone="slate" />
            <Stat label="90th %ile"  value={fmtMoney(area.Pct90, area.RateType)} tone="slate" />
          </dl>
          <p className="mt-3 text-[11px] text-slate-500">
            {area.RateType === 'Hourly' ? 'Hourly wages' : 'Annual wages'}
            {area.Mean && ` · Mean ${fmtMoney(area.Mean, area.RateType)}`}
          </p>
          {(postedSalaryMin || postedSalaryMax) && area.Median && area.RateType === 'Annual' && (
            <PostedComparison
              postedMin={postedSalaryMin}
              postedMax={postedSalaryMax}
              median={Number(area.Median)}
              p25={Number(area.Pct25)}
              p75={Number(area.Pct75)}
            />
          )}
        </>
      )}
    </section>
  );
}

// ─── helpers ───────────────────────────────────────────────────────

function pickBestArea(data: CosWagesResponse | null, region: string | null): CosWageArea | null {
  const occupations = data?.OccupationDetail ?? [];
  if (occupations.length === 0) return null;
  const wages = occupations[0]?.Wages?.BLSAreaWagesList ?? [];
  if (wages.length === 0) return null;
  // Prefer the area whose name contains the user's state; else the first
  // area returned (typically national).
  if (region) {
    const stateMatch = wages.find((a) =>
      typeof a.AreaName === 'string' && a.AreaName.toUpperCase().includes(region.toUpperCase()),
    );
    if (stateMatch) return stateMatch;
  }
  return wages[0];
}

function fmtMoney(raw?: string, rateType?: string): string {
  if (!raw) return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  if (rateType === 'Hourly') return `$${n.toFixed(2)}/hr`;
  return `$${Math.round(n).toLocaleString()}`;
}

function Stat({
  label, value, tone, emphasis,
}: { label: string; value: string; tone: 'teal' | 'slate'; emphasis?: boolean }) {
  const cls =
    tone === 'teal'
      ? `border-teal-200 ${emphasis ? 'bg-teal-50' : 'bg-white'} text-teal-800`
      : 'border-slate-200 bg-white text-slate-700';
  return (
    <div className={`rounded-xl border ${cls} p-3 text-center`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</dt>
      <dd className={`mt-1 ${emphasis ? 'text-base font-bold' : 'text-sm font-semibold'}`}>{value}</dd>
    </div>
  );
}

function PostedComparison({
  postedMin, postedMax, median, p25, p75,
}: { postedMin: number | null; postedMax: number | null; median: number; p25: number; p75: number }) {
  // Use the midpoint of the posted band when both bounds are present.
  const posted = postedMin && postedMax
    ? (postedMin + postedMax) / 2
    : (postedMin ?? postedMax ?? null);
  if (!posted) return null;

  let verdict: { tone: 'rose' | 'amber' | 'emerald'; text: string };
  if (posted < p25) {
    verdict = { tone: 'rose', text: `Below the 25th percentile for this role in this area — significantly under market.` };
  } else if (posted < median) {
    verdict = { tone: 'amber', text: `Between the 25th and 50th percentile — a bit under market.` };
  } else if (posted <= p75) {
    verdict = { tone: 'emerald', text: `Between the median and 75th percentile — competitive for the area.` };
  } else {
    verdict = { tone: 'emerald', text: `Above the 75th percentile — premium pay for this role in this area.` };
  }

  const styles = {
    rose:    'border-rose-200    bg-rose-50    text-rose-800',
    amber:   'border-amber-200   bg-amber-50   text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[verdict.tone];

  return (
    <div className={`mt-3 rounded-md border p-3 text-xs ${styles}`}>
      <strong>This posting:</strong> {verdict.text}
    </div>
  );
}
