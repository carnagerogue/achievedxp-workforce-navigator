/**
 * Shimmering placeholder for in-flight data. Compose like a lego: build a
 * skeleton that mirrors the final layout (same card → same shape) so the
 * page doesn't jump when data lands.
 */
export function Skeleton({
  className = '',
  as: Tag = 'div',
}: {
  className?: string;
  as?: 'div' | 'span' | 'p';
}) {
  return (
    <Tag
      role="presentation"
      aria-hidden="true"
      className={`skeleton-shimmer rounded-md ${className}`}
    />
  );
}

/** Skeleton shaped like a JobRow on /jobs. */
export function JobRowSkeleton() {
  return (
    <li className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-3 w-10" />
      </div>
    </li>
  );
}

/** Skeleton shaped like a JobCard on the dashboard. */
export function JobCardSkeleton() {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-[70%]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-16 rounded-full" />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-6 w-40 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </article>
  );
}
