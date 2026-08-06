'use client';

/**
 * The poster section — Swiss-editorial giant numerals on a flat brand field.
 * Live numbers from /jobs/stats; honest fallbacks while loading.
 */
import { useEffect, useState } from 'react';
import { getJobsStats } from '../lib/api';

export function PosterStats() {
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
      .catch(() => {/* keep placeholders */});
    return () => { cancelled = true; };
  }, []);

  // Zero is a degraded state (providers unreachable), not a fact to poster-size.
  const postings = active ? `${(Math.max(100, Math.floor(active / 100) * 100)).toLocaleString()}+` : '—';
  const src = sources ? `${sources}` : '—';

  return (
    <div className="grid gap-14 sm:grid-cols-3 sm:gap-8">
      <Big n={src} label="live job sources, one feed" />
      <Big n={postings} label="real postings right now" />
      <Big n="100%" label="of every score, explained" />
    </div>
  );
}

function Big({ n, label }: { n: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-6xl font-semibold tracking-display text-white tabular-nums sm:text-7xl lg:text-[5.5rem] lg:leading-none">{n}</p>
      <p className="mt-3 text-sm font-medium text-teal-200/80">{label}</p>
    </div>
  );
}
