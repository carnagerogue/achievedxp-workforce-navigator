'use client';

import Link from 'next/link';
import { LifeBuoy, Phone, Globe, Plus, Check, ArrowRight } from 'lucide-react';
import type { BarrierResource } from '../../../lib/caseworker';
import type { CommunityResource } from '../../../lib/community-resources';

export function BarriersPanel({
  groups, addedIds, onAdd,
}: {
  groups: BarrierResource[];
  addedIds: Set<string>;
  onAdd: (res: CommunityResource, barrierKey: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <section id="barriers" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <LifeBuoy className="h-4 w-4 text-teal-600" /> Connect to local help
        </h2>
        <p className="mt-2 text-sm text-slate-500">No barriers flagged. Add barriers in the profile to surface matched resources.</p>
      </section>
    );
  }

  return (
    <section id="barriers" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
        <LifeBuoy className="h-4 w-4 text-teal-600" /> Connect to local help
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">Based on the barriers you flagged — add any to the action plan.</p>
      <div className="mt-3 space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{g.label}</p>
            <ul className="mt-1.5 space-y-1.5">
              {g.resources.slice(0, 3).map((res) => {
                const added = addedIds.has(`barrier:${res.id}`);
                return (
                  <li key={res.id} className="rounded-lg border border-slate-200 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-navy-900">{res.name}</p>
                      <button
                        onClick={() => onAdd(res, g.key)}
                        disabled={added}
                        className={
                          'inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ' +
                          (added ? 'bg-teal-50 text-teal-700' : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700')
                        }
                      >
                        {added ? <><Check className="h-3 w-3" /> Added</> : <><Plus className="h-3 w-3" /> Add</>}
                      </button>
                    </div>
                    {res.desc && <p className="mt-0.5 text-xs text-slate-500">{res.desc}</p>}
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      {res.phone && <a href={`tel:${res.phone.replace(/[^\d]/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"><Phone className="h-3 w-3" /> {res.phone}</a>}
                      <a href={res.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"><Globe className="h-3 w-3" /> Website</a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <Link href="/local-help" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
        Full local-help directory <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
