'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, Globe, Mail, AlertCircle, Search as SearchIcon } from 'lucide-react';
import {
  getCosApprenticeshipOffices,
  type CosApprenticeshipOffice,
} from '../lib/api';
import { useDebounce } from '../lib/use-debounce';

/**
 * State Apprenticeship Office finder.
 *
 * Why this matters: registered apprenticeship slots are coordinated by
 * each state's Office of Apprenticeship and its Apprenticeship Training
 * Representatives (ATRs). When a job-board search returns nothing, the
 * ATR is the right next call — they hold the actual sponsor roster. This
 * component pulls that contact list directly from the U.S. Department of
 * Labor via CareerOneStop.
 *
 * Defaults to 100-mile radius because state OA offices are sparse — one
 * or two per state — and we'd rather show "the nearest office is 80
 * miles away in Columbus" than an empty list.
 */
interface Props {
  /** Default location in the input. ZIP or "City, ST" both work. */
  defaultLocation?: string;
}

export function ApprenticeshipOffices({ defaultLocation = '' }: Props) {
  const [location, setLocation] = useState(defaultLocation);
  const [radius, setRadius] = useState(100);
  const [offices, setOffices] = useState<CosApprenticeshipOffice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const dLocation = useDebounce(location, 400);

  useEffect(() => {
    const trimmed = dLocation.trim();
    if (!trimmed) {
      setOffices([]);
      setError(null);
      return;
    }
    setTouched(true);
    setLoading(true);
    setError(null);
    getCosApprenticeshipOffices(trimmed, radius)
      .then((res) => {
        // CareerOneStop sometimes returns the list under
        // ApprenticeshipOfficeList, sometimes under Apprenticeships.
        // Accept either rather than failing on a shape change.
        const list = res.ApprenticeshipOfficeList ?? res.Apprenticeships ?? [];
        setOffices(list);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dLocation, radius]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunset-50 text-sunset-700">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-navy-900">State apprenticeship offices near you</h2>
          <p className="mt-1 text-sm text-slate-600">
            The registered-apprenticeship roster lives with your state's Office of Apprenticeship,
            not on a job board. Call the closest office to ask which sponsors are accepting
            applicants and which programs are fair-chance friendly.
          </p>
        </div>
      </div>

      {/* Location input */}
      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-700">ZIP or City, State</span>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 43215 or Cleveland, OH"
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
            />
          </div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-700">Radius · {radius} mi</span>
          <input
            type="range"
            min={25}
            max={300}
            step={25}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="block w-full accent-sunset-600"
          />
        </label>
      </div>

      {/* Results */}
      <div className="mt-5">
        {!touched && !location && (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
            Enter a ZIP or city above to find the nearest state apprenticeship office.
          </p>
        )}

        {loading && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <li key={i} className="h-32 rounded-xl bg-slate-100" />
            ))}
          </ul>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Could not load offices: {error}</span>
          </div>
        )}

        {!loading && !error && touched && offices.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center">
            <SearchIcon className="mx-auto h-5 w-5 text-slate-400" />
            <p className="mt-2 text-sm text-slate-700">No apprenticeship offices found in that area.</p>
            <p className="mt-1 text-xs text-slate-500">
              Try widening the radius, or use a state code (e.g. <code className="rounded bg-slate-100 px-1">OH</code>).
            </p>
          </div>
        )}

        {!loading && offices.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {offices.slice(0, 8).map((o, i) => <OfficeCard key={i} office={o} />)}
          </ul>
        )}
      </div>
    </section>
  );
}

function OfficeCard({ office }: { office: CosApprenticeshipOffice }) {
  const name = office.OfficeName ?? office.Office ?? 'Apprenticeship office';
  const state = office.StateAbbr ?? office.State ?? '';
  const cityState = [office.City, state].filter(Boolean).join(', ');
  const phone = office.Phone ?? '';
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const email = office.ContactEmail ?? office.Email ?? '';
  const url = office.Website ?? office.Url ?? '';

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-sunset-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sunset-700">
        <Building2 className="h-3 w-3" /> Apprenticeship office
      </div>
      <h3 className="mt-2 text-sm font-semibold text-navy-900">{name}</h3>
      {office.ContactName && (
        <p className="mt-0.5 text-xs text-slate-600">Contact: {office.ContactName}</p>
      )}
      {(office.Address1 || cityState) && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-700">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <span>
            {office.Address1}{office.Address2 ? ` ${office.Address2}` : ''}
            {(office.Address1 || office.Address2) && <br />}
            {[cityState, office.Zip].filter(Boolean).join(' ')}
          </span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {cleanPhone && (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-sunset-400 hover:text-sunset-700"
          >
            <Phone className="h-3 w-3" /> {phone}
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-sunset-400 hover:text-sunset-700"
          >
            <Mail className="h-3 w-3" /> Email
          </a>
        )}
        {url && (
          <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-sunset-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-sunset-700"
          >
            <Globe className="h-3 w-3" /> Website
          </a>
        )}
      </div>
    </li>
  );
}
