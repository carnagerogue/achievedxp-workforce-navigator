/**
 * Minimal horizontal bar chart. Each row is its own element (not a single
 * SVG) so tooltips, hover states, and accessibility are easy. Width is
 * computed from the ratio of count / max count, so the longest bar always
 * fills 100%.
 */
type Datum = { key: string; label: string; count: number };

export function HorizontalBarChart({
  data,
  tone = 'teal',
  maxRows = 8,
  formatCount = (n) => n.toLocaleString(),
}: {
  data: Datum[];
  tone?: 'teal' | 'sunset' | 'navy' | 'amber';
  maxRows?: number;
  formatCount?: (n: number) => string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  const bars = data.slice(0, maxRows);
  const max = Math.max(1, ...bars.map((b) => b.count));

  const barCls =
    tone === 'teal'   ? 'from-teal-500 to-teal-600'
    : tone === 'sunset' ? 'from-sunset-500 to-sunset-600'
    : tone === 'amber'  ? 'from-amber-500 to-amber-600'
    :                     'from-navy-500 to-navy-700';

  return (
    <ul className="space-y-2" role="list">
      {bars.map((b) => {
        const pct = Math.max(2, (b.count / max) * 100); // min 2% so zero-ish bars still render
        return (
          <li key={b.key} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 truncate text-slate-700" title={b.label}>
              <span className="capitalize">{b.label}</span>
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
              <div
                className={`h-full rounded-md bg-gradient-to-r ${barCls} transition-[width] duration-500`}
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-navy-900">
              {formatCount(b.count)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
