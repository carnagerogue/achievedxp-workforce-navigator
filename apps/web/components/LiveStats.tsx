'use client';

import { useEffect, useState } from 'react';
import { getJobsStats } from '../lib/api';

/**
 * Live counts for the landing-page hero. The "1,700+" / "3+" placeholders
 * went stale every time providers fluctuated, so we fetch the real numbers
 * from /jobs/stats on mount. Falls back to a sensible-looking shell if the
 * API is unreachable — never blocks the hero render.
 *
 * Numbers update on every page load, which is the right cadence here:
 * landing visitors are not return users, so a per-mount fetch is fine.
 */
export function LiveStats() {
  const [active, setActive] = useState<number | null>(null);
  const [sources, setSources] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJobsStats()
      .then((s) => {
        if (cancelled) return;
        setActive(s.totals.active);
        setSources(s.bySource.length);
      })
      .catch(() => {/* silent — keep skeleton state */});
    return () => { cancelled = true; };
  }, []);

  return (
    <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-slate-200 pt-6 text-sm">
      <Stat value={sources != null ? `${sources}+` : '…'} label="live job sources" />
      <Stat value={active != null ? formatActive(active) : '…'} label="active postings" />
      <Stat value="100%" label="explainable" />
    </dl>
  );
}

/** Round large numbers to a clean tagline-ready form. */
function formatActive(n: number): string {
  if (n < 100) return n.toLocaleString();
  // Round down to the nearest hundred so the number stays honest
  // (showing 2,847 looks made-up; "2,800+" is what marketers do).
  const rounded = Math.floor(n / 100) * 100;
  return `${rounded.toLocaleString()}+`;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{value}</dt>
      <dd className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</dd>
    </div>
  );
}
