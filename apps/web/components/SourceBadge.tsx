// Compact provenance chip. Color-coded per source so it's easy to scan a
// long list and understand where a posting came from at a glance.
const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  usajobs:  { label: 'USAJobs',  className: 'bg-navy-50   text-navy-700   border-navy-200' },
  adzuna:   { label: 'Adzuna',   className: 'bg-teal-50   text-teal-700   border-teal-200' },
  remotive: { label: 'Remotive', className: 'bg-sunset-50 text-sunset-700 border-sunset-200' },
};

export function SourceBadge({ code }: { code: string | undefined }) {
  if (!code) return null;
  const style = SOURCE_STYLES[code] ?? {
    label: code,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.className}`}
      title={`Source: ${style.label}`}
    >
      {style.label}
    </span>
  );
}
