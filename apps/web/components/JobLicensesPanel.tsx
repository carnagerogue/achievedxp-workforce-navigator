'use client';

import { useEffect, useState } from 'react';
import { Award, ExternalLink, AlertCircle, Info } from 'lucide-react';
import { getCosLicenses, type CosLicense } from '../lib/api';

/**
 * State licensing requirements for a job.
 *
 * Why this is high-value for justice-impacted candidates: many state
 * licenses (security guard, healthcare, real estate, cosmetology, plumbing,
 * etc.) have conviction-related disqualifiers that the job listing itself
 * never spells out. Surfacing the licensing board, fees, and renewal info
 * BEFORE the application keeps a candidate from spending hours on a role
 * the licensing board would block — and points them at the agency they'd
 * need to talk to first.
 *
 * Heuristic: only render when the job title looks license-relevant. We
 * do this client-side rather than server-side so the page can hydrate
 * fast and skip the network call entirely for non-licensed roles.
 */
const LICENSE_TITLE_KEYWORDS = [
  'driver', 'cdl', 'truck',
  'security', 'guard',
  'nurse', 'cna', 'lpn', 'rn',
  'real estate', 'realtor', 'broker',
  'cosmetolog', 'barber', 'esthetic', 'nail tech',
  'electric', 'plumb', 'hvac', 'contractor',
  'massage', 'physical therap',
  'social worker', 'counsel',
  'teacher', 'educat',
  'pharmac',
  'insurance agent', 'insurance broker',
  'appraiser',
  'auctioneer',
];

function looksLikeLicensedRole(title: string): boolean {
  const t = title.toLowerCase();
  return LICENSE_TITLE_KEYWORDS.some((k) => t.includes(k));
}

interface Props {
  jobTitle: string;
  /** USPS state code, e.g. "OH". Licenses are state-specific. */
  locationRegion: string | null;
}

export function JobLicensesPanel({ jobTitle, locationRegion }: Props) {
  const eligible = !!jobTitle && !!locationRegion && looksLikeLicensedRole(jobTitle);
  const [licenses, setLicenses] = useState<CosLicense[] | null>(null);
  const [loading, setLoading] = useState(eligible);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible || !locationRegion) return;
    setLoading(true);
    setError(null);
    getCosLicenses(jobTitle, locationRegion)
      .then((res) => {
        // Some COS responses arrive as `{ error, partial: true }` when
        // upstream returns no records — treat as empty rather than error.
        if (res.partial && (res.LicenseList?.length ?? 0) === 0) {
          setLicenses([]);
        } else {
          setLicenses(res.LicenseList ?? []);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jobTitle, locationRegion, eligible]);

  // Don't render anything for non-licensed roles — keeps the page clean.
  if (!eligible) return null;

  // Hide the panel entirely when COS returns 0 hits — there's no
  // information to add and a "no results" panel is just noise.
  if (!loading && (licenses?.length ?? 0) === 0 && !error) return null;

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
        <Award className="h-5 w-5 text-amber-600" /> State licensing requirements
        {locationRegion && (
          <span className="text-xs font-normal text-slate-500">· {locationRegion}</span>
        )}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Roles like this are typically governed by a state board. Some boards
        weigh prior convictions when deciding eligibility — confirm with the
        agency below <strong>before</strong> investing time in the application.
      </p>

      {loading && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Could not load licensing info: {error}</span>
        </div>
      )}

      {!loading && licenses && licenses.length > 0 && (
        <ul className="mt-4 space-y-3">
          {licenses.slice(0, 5).map((lic, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-navy-900">{lic.Title ?? 'License'}</h3>
                  {lic.AgencyName && (
                    <p className="mt-0.5 text-xs text-slate-700">
                      Issued by <strong className="text-slate-900">{lic.AgencyName}</strong>
                    </p>
                  )}
                </div>
                {lic.AgencyUrl && (
                  <a
                    href={lic.AgencyUrl.startsWith('http') ? lic.AgencyUrl : `https://${lic.AgencyUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                  >
                    Agency <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {lic.Description && (
                <p className="mt-2 text-xs leading-relaxed text-slate-700">{lic.Description.slice(0, 320)}{lic.Description.length > 320 ? '…' : ''}</p>
              )}
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-[11px] text-slate-600 sm:grid-cols-2">
                {lic.Fees && <Detail label="Fees">{lic.Fees}</Detail>}
                {lic.RenewalRequirements && <Detail label="Renewal">{lic.RenewalRequirements}</Detail>}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Conviction-based eligibility rules vary by state and license — call the
          issuing agency directly. A reentry coordinator on the <a href="/local-help" className="font-semibold underline">Local Help</a> page can help you reach the right person.
        </p>
      </div>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
