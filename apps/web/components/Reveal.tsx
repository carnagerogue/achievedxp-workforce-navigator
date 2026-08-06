'use client';

/**
 * Scroll-driven reveal — the quiet cinematic entrance both reference sites
 * live on. Children start slightly low and transparent, then rise and fade
 * in the first time they enter the viewport. One IntersectionObserver per
 * element, fired once; prefers-reduced-motion collapses the whole effect
 * via the global media query (transition-duration → 0).
 */
import { useEffect, useRef, useState } from 'react';

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  /** Stagger in ms — use 0/80/160 for sibling rhythm. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(22px)',
        transition: `opacity 700ms cubic-bezier(0.2,0,0,1) ${delay}ms, transform 700ms cubic-bezier(0.2,0,0,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
