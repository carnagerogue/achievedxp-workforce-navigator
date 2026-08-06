'use client';

/**
 * Numbers that arrive — counts from 0 to the target the first time the
 * element enters the viewport, with an ease-out so the last digits settle
 * slowly (the Hitparade move). Reduced motion or no IO → instant value.
 */
import { useEffect, useRef, useState } from 'react';

export function CountUp({ to, suffix = '', duration = 1400, className = '' }: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') { setValue(to); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setValue(Math.round(to * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref} className={className}>{value.toLocaleString()}{suffix}</span>;
}
