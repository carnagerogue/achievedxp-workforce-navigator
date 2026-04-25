'use client';

import { useEffect, useState } from 'react';

type Props = { score: number; size?: number };

// 70+ teal, 40-69 amber, else slate — matches the Top/Medium/Avoid buckets.
function colorForScore(score: number): { stroke: string; text: string } {
  if (score >= 70) return { stroke: '#0f8a82', text: 'text-teal-700' };
  if (score >= 40) return { stroke: '#b45309', text: 'text-amber-700' };
  return { stroke: '#64748b', text: 'text-slate-600' };
}

/**
 * Animated SVG score ring. Counts from 0 to the target in ~650ms so every
 * card has a little life without being distracting. Uses rAF rather than
 * CSS transitions so the SVG `strokeDashoffset` animates cleanly from the
 * start instead of jumping on mount.
 */
export function ScoreRing({ score, size = 56 }: Props) {
  const [display, setDisplay] = useState(0);
  const target = Math.max(0, Math.min(100, score));

  useEffect(() => {
    let rafId = 0;
    const duration = 650;
    const startTs = performance.now();
    const tick = (t: number) => {
      const elapsed = t - startTs;
      const ratio = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - ratio, 3);
      setDisplay(Math.round(target * eased));
      if (ratio < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target]);

  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;
  const { stroke, text } = colorForScore(display);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${target} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-sm font-bold ${text}`}>{display}</span>
    </div>
  );
}
