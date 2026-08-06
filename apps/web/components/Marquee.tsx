'use client';

/**
 * Infinite ticker band — the Swiss-poster marquee. Content is rendered twice
 * and slid by -50% on a linear loop, so the seam is invisible at any width.
 * Under prefers-reduced-motion the global media query zeroes the animation,
 * leaving a static band (still legible, still on-brand).
 */
export function Marquee({ children, className = '', duration = 24 }: {
  children: React.ReactNode;
  className?: string;
  /** Seconds per half-loop. */
  duration?: number;
}) {
  return (
    <div className={'overflow-hidden whitespace-nowrap ' + className} aria-hidden="true">
      <div className="marquee-track inline-flex items-center" style={{ animationDuration: `${duration}s` }}>
        <div className="inline-flex shrink-0 items-center">{children}</div>
        <div className="inline-flex shrink-0 items-center">{children}</div>
      </div>
    </div>
  );
}
