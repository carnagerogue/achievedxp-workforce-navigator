/**
 * Small SVG donut. Each slice draws with `strokeDasharray` so we avoid any
 * path-math for arcs. Legend is a separate grid so long labels wrap.
 */
type Slice = { key: string; label: string; count: number; color: string };

export function DonutChart({
  slices,
  size = 140,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.count, 0) || 1;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const rendered = slices.map((s) => {
    const frac = s.count / total;
    const dash = frac * circumference;
    const el = (
      <circle
        key={s.key}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={s.color}
        strokeWidth={14}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={centerLabel ?? 'Donut chart'}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={14} />
          {rendered}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-xl font-bold text-navy-900">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="grid flex-1 gap-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="truncate text-slate-700"><span className="capitalize">{s.label}</span></span>
            <span className="ml-auto text-xs font-semibold tabular-nums text-navy-900">
              {s.count.toLocaleString()} <span className="text-slate-400">({Math.round((s.count / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
