'use client';

/**
 * The poster board — chart-style stacked rows on a flat brand field, each a
 * giant numeral that counts up as it enters, label seated on the baseline.
 * Live numbers from /jobs/stats; degraded states render an em dash, never 0.
 */
import { useEffect, useState } from 'react';
import { getJobsStats } from '../lib/api';
import { CountUp } from './CountUp';

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

  const postings = active ? Math.max(100, Math.floor(active / 100) * 100) : null;

  return (
    <div className="divide-y divide-white/15 border-y border-white/15">
      <Row value={sources || null} suffix="+" label="live job sources, one feed" />
      <Row value={postings} suffix="+" label="real postings, right now" />
      <Row value={100} suffix="%" label="of every score, explained" />
    </div>
  );
}

function Row({ value, suffix, label }: { value: number | null; suffix: string; label: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-7 sm:py-9">
      <p className="text-[clamp(4.5rem,11vw,9.5rem)] font-extrabold leading-[0.85] tracking-[-0.04em] text-white tabular-nums">
        {value != null ? <CountUp to={value} suffix={suffix} /> : '—'}
      </p>
      <p className="pb-1 text-sm font-semibold uppercase tracking-[0.22em] text-teal-200/90 sm:text-base">{label}</p>
    </div>
  );
}
