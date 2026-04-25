/**
 * Placeholder per the Phase-3 plan. The real recommendation engine lands in
 * Phase 6 (AchieveDXP integration) — course mapping + unlock paths like
 * "complete OSHA 10 → unlock 4 new construction jobs." For now we show a
 * generic list grounded in the missing certifications most commonly seen
 * on ingested postings.
 */
export function TrainingPlaceholder() {
  const items = [
    { title: 'Earn OSHA 10-Hour',              unlock: '4+ construction roles', color: 'bg-teal-500' },
    { title: 'Complete Forklift Operator Cert', unlock: '3+ warehouse roles',   color: 'bg-sunset-500' },
    { title: 'Get ServSafe Food Handler',       unlock: '2+ food service roles', color: 'bg-navy-500' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <ul className="divide-y divide-slate-100">
        {items.map((it) => (
          <li key={it.title} className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${it.color}`} aria-hidden />
              <div>
                <p className="text-sm font-medium text-navy-900">{it.title}</p>
                <p className="text-xs text-slate-500">Unlocks {it.unlock}</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              Phase 6
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
