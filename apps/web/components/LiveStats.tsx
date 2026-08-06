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
    <dl className="mt-10 flex max-w-lg items-center gap-7 border-t border-slate-900/[0.07] pt-6 sm:gap-9">
      <Stat value={sources != null ? `${sources}+` : '…'} label="live sources" />
      <Divider />
      <Stat value={active != null ? formatActive(active) : '…'} label="active postings" />
      <Divider />
      <Stat value="100%" label="explainable" />
    </dl>
  );
}

function Divider() {
  return <div aria-hidden="true" className="h-8 w-px bg-slate-900/[0.07]" />;
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
      <dt className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-2xl">{value}</dt>
      <dd className="mt-0.5 text-[11px] font-medium text-slate-400">{label}</dd>
    </div>
  );
}
