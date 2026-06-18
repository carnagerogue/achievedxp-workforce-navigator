'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, MapPin, Phone, Globe, Clock, HeartHandshake, Search as SearchIcon,
  AlertCircle, ExternalLink, Map, LifeBuoy, Home, Utensils, Bus, Scale,
  HeartPulse, Wallet, Baby, Shirt, GraduationCap,
} from 'lucide-react';
import {
  getAjcCenters,
  getReentryPrograms,
  type AjcCenter,
  type AjcCentersResponse,
} from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';
import { useDebounce } from '../../lib/use-debounce';

/**
 * In-person resources page. Two tabs of CareerOneStop / DOL data:
 *   - American Job Centers — ~3,000 federally-funded one-stops nationwide.
 *     Free help with job search, training, benefits, resume.
 *   - Reentry programs — orgs serving justice-impacted candidates
 *     specifically (transitional housing, fair-chance employment,
 *     workforce training, expungement clinics, etc.)
 *
 * Both lookups run server-side via our /careeronestop proxy so the
 * CareerOneStop token never reaches the browser.
 */
export default function LocalHelpPage() {
  const [tab, setTab] = useState<'ajc' | 'reentry' | 'community'>('ajc');
  const [location, setLocation] = useState('44113');
  const [radius, setRadius] = useState(50);
  const dLoc = useDebounce(location, 400);

  return (
    <div className="animate-fade-in">
      <header className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <HeartHandshake className="h-3.5 w-3.5" /> Local help
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          In-person resources near you
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          American Job Centers offer free help with job search, training, and benefits.
          Reentry programs serve justice-impacted candidates with fair-chance jobs,
          transitional services, and expungement clinics.
        </p>

        <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              ZIP code or city, state
            </span>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 44113 or Cleveland, OH"
                className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Radius · {radius} mi
            </span>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="block w-full accent-teal-600"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          <TabButton active={tab === 'ajc'} onClick={() => setTab('ajc')}>
            <Building2 className="h-4 w-4" /> American Job Centers
          </TabButton>
          <TabButton active={tab === 'reentry'} onClick={() => setTab('reentry')}>
            <HeartHandshake className="h-4 w-4" /> Reentry Programs
          </TabButton>
          <TabButton active={tab === 'community'} onClick={() => setTab('community')}>
            <LifeBuoy className="h-4 w-4" /> Community Resources
          </TabButton>
        </div>
      </header>

      <div className="mt-6">
        {tab === 'ajc' && <AjcResults location={dLoc} radius={radius} />}
        {tab === 'reentry' && <ReentryResults location={dLoc} radius={radius} />}
        {tab === 'community' && <FindhelpResources location={dLoc} />}
      </div>

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-xs text-slate-600">
        Job centers &amp; reentry programs from{' '}
        <a href="https://www.careeronestop.org" target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">
          CareerOneStop
        </a>{' '}
        (U.S. Department of Labor). Community resources powered by{' '}
        <a href="https://www.findhelp.org" target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">
          findhelp.org
        </a>
        . Free to use; no account required.
      </footer>
    </div>
  );
}

/**
 * Wraparound community services (housing, food, transport, legal/record
 * clearing, health, money, childcare, clothing, education) — the supports a
 * justice-impacted job seeker needs to actually keep a job.
 *
 * Rendered as native, on-brand category cards that deep-link into
 * findhelp.org's ZIP-scoped search (the nation's largest social-care
 * directory). findhelp's own program data is only available via their paid
 * partner API or by scraping (which they block), so — like other free
 * integrators — we hand off to their maintained directory on click rather
 * than copy their data. Pairs findhelp's breadth with our DOL job-center +
 * reentry data, going beyond a job board alone.
 */
const FINDHELP_CATEGORIES: Array<{ key: string; label: string; term: string; desc: string; Icon: typeof Home }> = [
  { key: 'housing',   label: 'Housing',            term: 'housing',              desc: 'Emergency shelter, rent & utility help, transitional housing.', Icon: Home },
  { key: 'food',      label: 'Food',               term: 'food',                 desc: 'Food pantries, free meals, SNAP & benefits help.',             Icon: Utensils },
  { key: 'transit',   label: 'Transportation',     term: 'transportation',       desc: 'Bus passes, gas help, rides to work or appointments.',         Icon: Bus },
  { key: 'legal',     label: 'Legal & records',    term: 'expungement',          desc: 'Record-clearing & expungement clinics, legal aid, ID help.',   Icon: Scale },
  { key: 'health',    label: 'Health & recovery',  term: 'addiction',            desc: 'Clinics, mental health, addiction & recovery support.',        Icon: HeartPulse },
  { key: 'money',     label: 'Money help',         term: 'financial assistance', desc: 'Emergency cash, benefits navigation, financial coaching.',     Icon: Wallet },
  { key: 'family',    label: 'Childcare & family', term: 'childcare',            desc: 'Childcare assistance, parenting & family support.',            Icon: Baby },
  { key: 'clothing',  label: 'Interview clothing', term: 'clothing',             desc: 'Free interview-ready clothing & professional attire.',         Icon: Shirt },
  { key: 'education', label: 'Education & skills', term: 'education',             desc: 'GED, adult education, skills training, tutoring.',             Icon: GraduationCap },
];

function extractZip(input: string): string | null {
  const m = /\b(\d{5})\b/.exec(input);
  return m ? m[1] : null;
}

const findhelpSearchUrl = (zip: string, term: string) =>
  `https://www.findhelp.org/search_results/${zip}?term=${encodeURIComponent(term)}`;

function FindhelpResources({ location }: { location: string }) {
  const zip = extractZip(location);

  if (!zip) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-navy-900">Enter a ZIP code</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Community resources are matched by ZIP. Add a 5-digit ZIP code above to see
          housing, food, transportation, legal, and other support near you.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50/70 to-white p-4">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-navy-900">Free &amp; reduced-cost support</span> near{' '}
          <span className="font-semibold text-navy-900">{zip}</span> — pick a category to see local programs.
        </p>
        <a
          href={findhelpSearchUrl(zip, '')}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Browse all on findhelp.org <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FINDHELP_CATEGORIES.map(({ key, label, term, desc, Icon }) => (
          <li key={key}>
            <a
              href={findhelpSearchUrl(zip, term)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-card-hover"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-navy-900">{label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                Find near {zip} <ExternalLink className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-center text-xs text-slate-500">
        Resources from{' '}
        <a href="https://www.findhelp.org" target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">
          findhelp.org
        </a>{' '}
        — a free national directory of 600,000+ social-care programs.
      </p>
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ' +
        (active
          ? 'bg-teal-600 text-white shadow-sm'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50')
      }
    >
      {children}
    </button>
  );
}

function AjcResults({ location, radius }: { location: string; radius: number }) {
  const [data, setData] = useState<AjcCentersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(null);
    getAjcCenters(location, radius)
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location, radius]);

  if (loading) return <ListSkeleton />;
  if (error)   return <ErrorPanel message={error} />;

  const centers = data?.OneStopCenterList ?? [];
  if (centers.length === 0) {
    return (
      <OfficialFinderPanel
        message={data?.meta?.message ?? 'No American Job Centers in that area — try widening the radius or a nearby city.'}
        finderUrl={data?.meta?.finderUrl}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {centers.map((c) => <AjcCard key={c.ID} center={c} />)}
    </ul>
  );
}

function OfficialFinderPanel({ message, finderUrl }: { message: string; finderUrl?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Building2 className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-navy-900">Find a center near you</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{message}</p>
      {finderUrl && (
        <a
          href={finderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <Globe className="h-4 w-4" /> Official DOL center finder <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function ReentryResults({ location, radius }: { location: string; radius: number }) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(null);
    getReentryPrograms(location, radius)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location, radius]);

  if (loading) return <ListSkeleton />;
  if (error)   return <ErrorPanel message={error} />;

  // CareerOneStop returns either an array of records OR a single-element
  // array with `Error` describing "no matches".
  const list = Array.isArray(data) ? data : [];
  const isEmpty = list.length === 0 || (list[0] && typeof list[0] === 'object' && 'Error' in list[0]);
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <SearchIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-navy-900">No programs found in that area</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Try a wider radius or a state code (e.g. <code className="rounded bg-slate-100 px-1">OH</code>). The reentry-program
          finder includes a smaller set of records than the full AJC directory — many areas
          have AJCs but no specifically-tagged reentry programs.
        </p>
        <p className="mx-auto mt-3 max-w-md text-xs text-slate-500">
          Most American Job Centers can refer you to local reentry partners even if they
          aren't listed here. Switch to the <strong>American Job Centers</strong> tab and call your closest one.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {(list as Array<Record<string, unknown>>).map((p, i) => (
        <ReentryCard key={String(p.Id ?? p.ID ?? i)} program={p} />
      ))}
    </ul>
  );
}

function AjcCard({ center }: { center: AjcCenter }) {
  const cleanPhone = (center.Phone ?? '').replace(/[^\d]/g, '');
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-700">
            <Building2 className="h-3 w-3" /> {center.ProgramType ?? 'Job Center'}
          </div>
          <h3 className="mt-2 text-base font-semibold text-navy-900">{center.Name}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
          {center.Distance} mi
        </span>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-700">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          {center.Address1}{center.Address2 ? `, ${center.Address2}` : ''}<br />
          {center.City}, {center.StateAbbr} {center.Zip}
        </span>
      </p>

      {center.OpenHour && (
        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-slate-600">
          <Clock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <span>{center.OpenHour}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {cleanPhone && (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <Phone className="h-3 w-3" /> {center.Phone}
          </a>
        )}
        {center.WebSiteUrl && (
          <a
            href={center.WebSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Globe className="h-3 w-3" /> Visit website <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {center.Latitude && center.Longitude && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${center.Latitude},${center.Longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Map className="h-3 w-3" /> Directions
          </a>
        )}
      </div>
    </li>
  );
}

function ReentryCard({ program }: { program: Record<string, unknown> }) {
  // CareerOneStop's reentry shape varies — be defensive about field names.
  const name = String(program.Name ?? program.OrgName ?? program.ProgramName ?? 'Program');
  const desc = String(program.Description ?? program.About ?? '');
  const addr1 = String(program.Address1 ?? program.Address ?? '');
  const city = String(program.City ?? '');
  const state = String(program.StateAbbr ?? program.State ?? '');
  const zip = String(program.Zip ?? program.ZipCode ?? '');
  const phone = String(program.Phone ?? '');
  const url = String(program.Url ?? program.WebSiteUrl ?? program.Website ?? '');
  const services = (program.Services as string[] | undefined) ?? [];

  const cleanPhone = phone.replace(/[^\d]/g, '');
  const distance = String(program.Distance ?? '');
  const isNational = program.Scope === 'National';

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sunset-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sunset-700">
          <HeartHandshake className="h-3 w-3" /> {isNational ? 'National resource' : 'Reentry program'}
        </div>
        {!isNational && distance && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{distance} mi</span>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold text-navy-900">{name}</h3>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{desc}</p>}

      {(addr1 || city) && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-700">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            {addr1}<br />
            {[city, state, zip].filter(Boolean).join(', ')}
          </span>
        </p>
      )}

      {services.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {services.slice(0, 6).map((s, i) => (
            <span key={i} className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] text-teal-800">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {cleanPhone && (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <Phone className="h-3 w-3" /> {phone}
          </a>
        )}
        {url && (
          <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Globe className="h-3 w-3" /> Visit website <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-3/4" />
          <Skeleton className="mt-3 h-7 w-32 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Couldn't load resources</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <SearchIcon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm text-slate-700">{message}</p>
    </div>
  );
}
