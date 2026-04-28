'use client';

import { useState } from 'react';
import { GraduationCap, ExternalLink, Loader2, MapPin } from 'lucide-react';
import { getCosTraining, type CosTrainingProgram } from '../lib/api';

/**
 * Inline expand for a TrainingBridge step. Closes the loop between
 * "what credential you need" and "where to actually get it nearby."
 *
 * The TrainingBridge step gives us a `keyword` (e.g., "OSHA 10",
 * "forklift certification", "CDL") and the location comes from the job
 * being viewed. Click to fetch — we don't preload because most users
 * won't expand all steps.
 */
interface Props {
  /** Search keyword passed to CareerOneStop — usually the step title. */
  keyword: string;
  /** USPS state code — training programs are local. */
  locationRegion: string | null;
  /** Optional radius in miles. */
  radiusMiles?: number;
}

export function TrainingProgramsList({ keyword, locationRegion, radiusMiles = 50 }: Props) {
  const [open, setOpen] = useState(false);
  const [programs, setPrograms] = useState<CosTrainingProgram[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = async () => {
    if (!locationRegion) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCosTraining(keyword, locationRegion, radiusMiles);
      setPrograms(res.SchoolPrograms?.SchoolProgramList ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open && programs === null) void fetchPrograms();
    setOpen((v) => !v);
  };

  // Without a region we can't search — hide the affordance. The step's
  // generic resource link in the parent component still surfaces.
  if (!locationRegion) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800 transition hover:bg-teal-100"
      >
        <GraduationCap className="h-3 w-3" />
        {open ? 'Hide local programs' : 'Find local programs'}
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-teal-100 bg-teal-50/40 p-2.5">
          {loading && (
            <p className="flex items-center gap-1.5 text-[11px] text-teal-800">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching CareerOneStop…
            </p>
          )}
          {error && (
            <p className="text-[11px] text-rose-700">Couldn't load: {error}</p>
          )}
          {!loading && !error && programs && programs.length === 0 && (
            <p className="text-[11px] text-slate-600">
              No programs found near {locationRegion}. Try a wider state or check
              the resource link above.
            </p>
          )}
          {!loading && !error && programs && programs.length > 0 && (
            <ul className="space-y-1.5">
              {programs.slice(0, 5).map((p, i) => (
                <li key={i} className="rounded border border-white bg-white p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900">{p.ProgramName ?? 'Training program'}</p>
                      {p.SchoolName && <p className="truncate text-[11px] text-slate-700">{p.SchoolName}</p>}
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {[p.City, p.State, p.Zip].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    {p.ProgramUrl && (
                      <a
                        href={p.ProgramUrl.startsWith('http') ? p.ProgramUrl : `https://${p.ProgramUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-0.5 rounded border border-teal-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 hover:bg-teal-100"
                      >
                        Visit <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
