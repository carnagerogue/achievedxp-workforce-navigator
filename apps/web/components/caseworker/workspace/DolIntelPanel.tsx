'use client';

import { useEffect, useState } from 'react';
import {
  Landmark, DollarSign, MapPin, GraduationCap, ScrollText, Building2,
  Phone, Plus, Check, ExternalLink, Info,
} from 'lucide-react';
import { loadDolIntel, formatWage, type DolIntel } from '../../../lib/caseworker-dol';

export function DolIntelPanel({
  goal, location, addedIds, onAddCenter,
}: {
  goal: string;
  location: string;
  addedIds: Set<string>;
  onAddCenter: (center: { id: string; name: string; url?: string }) => void;
}) {
  const [data, setData] = useState<DolIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const hasZip = /^\d{5}$/.test(location.trim());

  useEffect(() => {
    if (!hasZip) { setData(null); return; }
    let live = true;
    setLoading(true);
    loadDolIntel(goal, location.trim())
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [goal, location, hasZip]);

  return (
    <section id="dol" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
        <Landmark className="h-4 w-4 text-teal-600" /> Local labor-market &amp; training
        <span className="text-sm font-normal text-slate-400">DOL</span>
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Wages, job centers, training and licensing for {goal || 'this goal'} in {location || 'this area'}.
      </p>

      {!hasZip && <p className="mt-4 text-sm text-slate-500">Add a 5-digit ZIP to pull local labor-market data.</p>}
      {hasZip && loading && !data && <p className="mt-4 text-sm text-slate-500">Loading DOL data…</p>}

      {data && (
        <div className="mt-4 space-y-5">
          {data.centersMeta && !data.centersMeta.configured && (
            <p className="inline-flex items-start gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Showing national resources + the official DOL finder. Live local data needs a CareerOneStop API key.
            </p>
          )}

          {/* Wages */}
          {data.wages && (
            <div>
              <SubHead Icon={DollarSign} label={`Typical ${data.wages.rateType.toLowerCase()} wages`} />
              <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                {([['10th', data.wages.pct10], ['25th', data.wages.pct25], ['Median', data.wages.median], ['75th', data.wages.pct75], ['90th', data.wages.pct90]] as const).map(([lbl, val]) => (
                  <div key={lbl} className={'rounded-lg border p-2 ' + (lbl === 'Median' ? 'border-teal-300 bg-teal-50' : 'border-slate-200')}>
                    <p className={'text-xs font-bold ' + (lbl === 'Median' ? 'text-teal-700' : 'text-navy-900')}>{formatWage(val)}</p>
                    <p className="text-[10px] text-slate-400">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* American Job Centers */}
          {data.centers.length > 0 && (
            <div>
              <SubHead Icon={MapPin} label="American Job Centers nearby" />
              <ul className="mt-2 space-y-1.5">
                {data.centers.slice(0, 3).map((c) => {
                  const id = `dol-ajc:${c.ID}`;
                  const added = addedIds.has(id);
                  return (
                    <li key={c.ID} className="rounded-lg border border-slate-200 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-900">{c.Name}</p>
                          <p className="text-xs text-slate-500">{c.City}, {c.StateAbbr} · {c.Distance} mi</p>
                          {c.Phone && <a href={`tel:${c.Phone.replace(/[^\d]/g, '')}`} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"><Phone className="h-3 w-3" /> {c.Phone}</a>}
                        </div>
                        <button
                          onClick={() => onAddCenter({ id: c.ID, name: c.Name, url: c.WebSiteUrl })}
                          disabled={added}
                          className={'inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ' + (added ? 'bg-teal-50 text-teal-700' : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700')}
                        >
                          {added ? <><Check className="h-3 w-3" /> Added</> : <><Plus className="h-3 w-3" /> Appt.</>}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {data.centersMeta?.finderUrl && (
            <a href={data.centersMeta.finderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
              <ExternalLink className="h-3 w-3" /> Official DOL job-center finder
            </a>
          )}

          {/* Apprenticeships */}
          {data.apprenticeships.length > 0 && (
            <div>
              <SubHead Icon={GraduationCap} label="Apprenticeships" />
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {data.apprenticeships.slice(0, 4).map((a, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <p className="font-semibold text-navy-900">{a.title}</p>
                    {a.sponsor && <p className="text-slate-500">{a.sponsor}{a.region ? ` · ${a.region}` : ''}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Licenses */}
          {data.licenses.length > 0 && (
            <div>
              <SubHead Icon={ScrollText} label="License / certification requirements" />
              <ul className="mt-2 space-y-1.5">
                {data.licenses.slice(0, 4).map((l, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <p className="font-semibold text-navy-900">{l.title}{l.region ? <span className="ml-1 font-normal text-slate-400">· {l.region}</span> : null}</p>
                    {l.description && <p className="text-slate-500">{l.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reentry programs */}
          {data.reentry.length > 0 && (
            <div>
              <SubHead Icon={Building2} label="Reentry programs" />
              <ul className="mt-2 space-y-1.5">
                {data.reentry.slice(0, 3).map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <p className="font-semibold text-navy-900">{r.name}{r.scope ? <span className="ml-1 font-normal text-slate-400">· {r.scope}</span> : null}</p>
                    {r.description && <p className="line-clamp-2 text-slate-500">{r.description}</p>}
                    <div className="mt-0.5 flex gap-2">
                      {r.phone && <a href={`tel:${r.phone.replace(/[^\d]/g, '')}`} className="font-semibold text-teal-700 hover:underline">{r.phone}</a>}
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 hover:underline">Website</a>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SubHead({ Icon, label }: { Icon: typeof DollarSign; label: string }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
      <Icon className="h-3.5 w-3.5 text-slate-400" /> {label}
    </p>
  );
}
