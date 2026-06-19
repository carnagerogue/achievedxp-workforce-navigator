'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Completion ring for caseworker plan progress. Unlike ScoreRing (which uses a
 * red→amber→green *quality* scale), progress is always positive: the arc fills
 * in the teal/emerald family so 30% reads as "early," not "bad." Animates on
 * mount and shows a check at 100%.
 */
function strokeFor(pct: number): string {
  if (pct >= 100) return 'var(--emerald, #10b981)';
  if (pct >= 60) return '#0d9488';   // teal-600
  if (pct >= 30) return '#14b8a6';   // teal-500
  if (pct > 0) return '#2dd4bf';     // teal-400
  return '#cbd5e1';                  // slate-300 (empty)
}

export function ProgressRing({
  pct, size = 56, stroke = 5, showLabel = true,
}: { pct: number; size?: number; stroke?: number; showLabel?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const [val, setVal] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (clamped - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [clamped]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - val / 100);
  const color = strokeFor(clamped);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          {clamped >= 100
            ? <Check className="text-emerald-500" style={{ width: size * 0.4, height: size * 0.4 }} strokeWidth={3} />
            : <span className="font-bold text-navy-900" style={{ fontSize: size * 0.3 }}>{clamped}</span>}
        </div>
      )}
    </div>
  );
}
