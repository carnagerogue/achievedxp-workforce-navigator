'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search as SearchIcon,
  MapPin,
  Factory,
  Scale,
  Briefcase,
  X,
  SearchX,
  Building2,
  Clock,
  Wallet,
  Radio,
  Calendar,
  HardHat,
} from 'lucide-react';
import type { JobDto, OffenseType, PaginatedJobsDto } from '@dxp/shared';
import { listJobs } from '../../lib/api';
import { RiskBadge } from '../../components/RiskBadge';
import { SourceBadge } from '../../components/SourceBadge';
import { JobRowSkeleton } from '../../components/Skeleton';
import { SaveJobButton } from '../../components/SaveJobButton';
import { CompareButton } from '../../components/CompareButton';
import { prettyDate, prettyIndustry, prettySalary } from '../../lib/format';
import { parseLocationInput } from '../../lib/location-parse';
import { useDebounce } from '../../lib/use-debounce';

const INDUSTRY_FILTERS = [
  '',
  'warehousing',
  'construction',
  'transportation',
  'food_service',
  'services',
  'security',
  'education',
  'manufacturing',
  'cleaning',
];

const OFFENSE_FILTERS: { value: OffenseType | ''; label: string }[] = [
  { value: '',                   label: 'Show all jobs (no conviction filter)' },
  { value: 'DRUG_POSSESSION',    label: 'Friendly to: drug possession conviction' },
  { value: 'DRUG_DISTRIBUTION',  label: 'Friendly to: drug distribution conviction' },
  { value: 'VIOLENT',            label: 'Friendly to: violent offense conviction' },
  { value: 'SEX_OFFENSE',        label: 'Friendly to: registrable offense conviction' },
  { value: 'PROPERTY_THEFT',     label: 'Friendly to: property / theft conviction' },
  { value: 'PROPERTY_BURGLARY',  label: 'Friendly to: burglary conviction' },
  { value: 'FINANCIAL_FRAUD',    label: 'Friendly to: financial fraud conviction' },
  { value: 'WEAPONS',            label: 'Friendly to: weapons-related conviction' },
  { value: 'DUI',                label: 'Friendly to: DUI / DWI conviction' },
  { value: 'OTHER',              label: 'Friendly to: other conviction' },
];

const PAGE_SIZE = 50;

export default function JobsPage() {
  const [results, setResults] = useState<JobDto[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [offenseType, setOffenseType] = useState<OffenseType | ''>('');
  const [hideClosedRecord, setHideClosedRecord] = useState(false);
  const [minSalary, setMinSalary] = useState(0);
  const [postedWithinDays, setPostedWithinDays] = useState(0);
  const [apprenticeshipsOnly, setApprenticeshipsOnly] = useState(false);

  // Debounce the text inputs so we don't hit the API on every keystroke.
  // 300ms feels instant but eliminates burst requests.
  const dq        = useDebounce(q, 300);
  const dLocation = useDebounce(locationInput, 300);

  const locationFilter = useMemo(() => parseLocationInput(dLocation), [dLocation]);

  useEffect(() => {
    setOffset(0);
    setResults([]);
  }, [dq, industry, locationFilter, radiusMiles, offenseType, hideClosedRecord, minSalary, postedWithinDays, apprenticeshipsOnly]);

  useEffect(() => {
    const isFirstPage = offset === 0;
    if (isFirstPage) setLoading(true); else setLoadingMore(true);
    setError(null);

    listJobs({
      q: dq || undefined,
      industry: industry || undefined,
      city:       locationFilter.city,
      region:     locationFilter.region,
      postalCode: locationFilter.postalCode,
      radiusMiles: locationFilter.postalCode ? radiusMiles : undefined,
      offenseType: offenseType || undefined,
      hideFelonExclusions: hideClosedRecord || undefined,
      minSalary: minSalary || undefined,
      postedWithinDays: postedWithinDays || undefined,
      apprenticeshipsOnly: apprenticeshipsOnly || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        setTotal(data.total);
        setResults((prev) => (isFirstPage ? data.results : [...prev, ...data.results]));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [offset, dq, industry, locationFilter, radiusMiles, offenseType, hideClosedRecord, minSalary, postedWithinDays, apprenticeshipsOnly]);

  const loadMore = () => setOffset(results.length);
  const hasMore = results.length < total;

  // Active-filter chip descriptors used in the summary row below the filter card.
  const activeChips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (dq)             activeChips.push({ key: 'q',        label: `Search: "${dq}"`,                     onClear: () => setQ('') });
  if (industry)       activeChips.push({ key: 'industry', label: `Industry: ${prettyIndustry(industry)}`, onClear: () => setIndustry('') });
  if (locationFilter.postalCode) {
    activeChips.push({ key: 'zip', label: `ZIP ${locationFilter.postalCode} (${radiusMiles} mi)`, onClear: () => setLocationInput('') });
  } else if (locationFilter.city && locationFilter.region) {
    activeChips.push({ key: 'cityregion', label: `${locationFilter.city}, ${locationFilter.region}`, onClear: () => setLocationInput('') });
  } else if (locationFilter.region) {
    activeChips.push({ key: 'region', label: `State: ${locationFilter.region}`, onClear: () => setLocationInput('') });
  } else if (locationFilter.city) {
    activeChips.push({ key: 'city', label: `City: ${locationFilter.city}`, onClear: () => setLocationInput('') });
  }
  if (offenseType)    activeChips.push({ key: 'offense', label: OFFENSE_FILTERS.find((o) => o.value === offenseType)?.label ?? '', onClear: () => setOffenseType('') });
  if (hideClosedRecord) activeChips.push({ key: 'hide', label: 'Hide clean-record requirements', onClear: () => setHideClosedRecord(false) });
  if (minSalary)        activeChips.push({ key: 'salary', label: `Min salary $${(minSalary / 1000)}k`, onClear: () => setMinSalary(0) });
  if (postedWithinDays) activeChips.push({ key: 'posted', label: postedWithinDays === 1 ? 'Posted last 24h' : `Posted last ${postedWithinDays} days`, onClear: () => setPostedWithinDays(0) });
  if (apprenticeshipsOnly) activeChips.push({ key: 'appr', label: 'Apprenticeships only', onClear: () => setApprenticeshipsOnly(false) });

  const clearAll = () => {
    setQ(''); setIndustry(''); setLocationInput(''); setOffenseType('');
    setHideClosedRecord(false); setMinSalary(0); setPostedWithinDays(0);
    setApprenticeshipsOnly(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Browse jobs</h1>
        <p className="mt-1 text-sm text-slate-600">
          All active postings ingested from our sources. Filter by conviction history to see
          only roles a candidate with that record would pass.
        </p>
      </div>

      {/* ─────────── Filter card ─────────── */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-3">
          <FilterField label="Search" Icon={SearchIcon}>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="title, company…"
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </FilterField>

          <FilterField label="Industry" Icon={Factory}>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {INDUSTRY_FILTERS.map((o) => (
                <option key={o} value={o}>{o ? prettyIndustry(o) : 'Any'}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Location" Icon={MapPin}>
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="ZIP, city, or state"
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <LocationHint filter={locationFilter} />
          </FilterField>

          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-slate-500" />
                Radius
              </span>
              <span className="font-semibold text-teal-700">
                {locationFilter.postalCode ? `${radiusMiles} miles` : 'enter a ZIP to use'}
              </span>
            </span>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={radiusMiles}
              disabled={!locationFilter.postalCode}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="block w-full accent-teal-600 disabled:opacity-50"
            />
          </label>

          <FilterField label="Minimum salary" Icon={Wallet}>
            <select
              value={minSalary}
              onChange={(e) => setMinSalary(Number(e.target.value))}
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value={0}>Any</option>
              <option value={30000}>$30k+</option>
              <option value={50000}>$50k+</option>
              <option value={75000}>$75k+</option>
              <option value={100000}>$100k+</option>
            </select>
          </FilterField>

          <FilterField label="Posted within" Icon={Calendar}>
            <select
              value={postedWithinDays}
              onChange={(e) => setPostedWithinDays(Number(e.target.value))}
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value={0}>Anytime</option>
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </FilterField>

          <FilterField label="Conviction-history filter" Icon={Scale}>
            <select
              value={offenseType}
              onChange={(e) => setOffenseType(e.target.value as OffenseType | '')}
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {OFFENSE_FILTERS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FilterField>

          <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition hover:bg-slate-100">
              <input
                type="checkbox"
                checked={hideClosedRecord}
                onChange={(e) => setHideClosedRecord(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="font-medium text-slate-800">Hide employers that require a clean record</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-sunset-200 bg-sunset-50/60 p-3 text-sm text-slate-700 transition hover:bg-sunset-50">
              <input
                type="checkbox"
                checked={apprenticeshipsOnly}
                onChange={(e) => setApprenticeshipsOnly(e.target.checked)}
                className="h-4 w-4 rounded border-sunset-400 text-sunset-600 focus:ring-sunset-500"
              />
              <HardHat className="h-4 w-4 text-sunset-600" />
              <span className="font-medium text-slate-800">Apprenticeships only — earn while you learn</span>
            </label>
          </div>
        </div>
      </div>

      {/* ─────────── Active filter chips ─────────── */}
      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Filters:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.onClear}
              className="group inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 transition hover:bg-teal-100"
            >
              {chip.label}
              <X className="h-3 w-3 opacity-60 transition group-hover:opacity-100" />
            </button>
          ))}
          <button
            onClick={clearAll}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}

      {/* ─────────── Results ─────────── */}
      {loading ? (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          {Array.from({ length: 6 }).map((_, i) => <JobRowSkeleton key={i} />)}
        </ul>
      ) : results.length === 0 ? (
        <EmptyState hasFilters={activeChips.length > 0} location={locationInput} onClear={clearAll} />
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            <strong className="font-semibold text-navy-900">{total.toLocaleString()}</strong> total
            <span className="mx-1.5 text-slate-300">·</span>
            showing {results.length.toLocaleString()}
          </p>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            {results.map((job) => <JobRow key={job.id} job={job} />)}
          </ul>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore
                  ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" /> Loading…</>
                  : <>Load more <span className="text-slate-400">({(total - results.length).toLocaleString()} remaining)</span></>}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof SearchIcon;
function FilterField({
  label, Icon, children,
}: { label: string; Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </label>
  );
}

function LocationHint({ filter }: { filter: ReturnType<typeof parseLocationInput> }) {
  let hint: string | null = null;
  if (filter.postalCode) hint = 'Treating as ZIP — radius enabled';
  else if (filter.region && filter.city) hint = `Treating as ${filter.city}, ${filter.region}`;
  else if (filter.region) hint = `Treating as state ${filter.region}`;
  else if (filter.city)   hint = `Treating as city "${filter.city}"`;
  if (!hint) return null;
  return <span className="mt-1 block text-[11px] text-teal-700">{hint}</span>;
}

function EmptyState({ hasFilters, location, onClear }: { hasFilters: boolean; location: string; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <SearchX className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-navy-900">
        {hasFilters ? 'No jobs match those filters' : 'No jobs yet'}
      </h3>
      {hasFilters ? (
        <>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            {location
              ? <>We may not yet have postings in <strong>"{location}"</strong>. Our providers ingest by keyword, so some metro areas aren't represented yet. Try a nearby ZIP, a state, or clearing the location filter.</>
              : <>Try removing a filter or broadening your search.</>}
          </p>
          <button
            onClick={onClear}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Clear all filters
          </button>
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-600">
          Try triggering <code className="rounded bg-slate-100 px-1 py-0.5">POST /ingestion/run</code> on the API to populate data.
        </p>
      )}
    </div>
  );
}

function JobRow({ job }: { job: JobDto }) {
  const cityRegion = [job.locationCity, job.locationRegion].filter(Boolean).join(', ');
  const location = cityRegion
    ? (job.locationPostalCode ? `${cityRegion} ${job.locationPostalCode}` : cityRegion)
    : 'Location TBD';
  const salary = prettySalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <li className="group transition hover:bg-slate-50">
      <Link href={`/jobs/${job.id}`} className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-navy-900 group-hover:text-teal-700">
              {job.title}
            </h3>
            <SourceBadge code={job.sourceCode} />
            {job.isApprenticeship && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sunset-200 bg-sunset-50 px-2 py-0.5 text-[11px] font-medium text-sunset-700">
                <HardHat className="h-3 w-3" /> Apprenticeship
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-600">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="font-medium text-slate-800">{job.company}</span>
            <span className="text-slate-300">·</span>
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{location}</span>
            <span className="text-slate-300">·</span>
            <span className="capitalize">{prettyIndustry(job.industry)}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {job.postedAt && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {prettyDate(job.postedAt)}</span>
            )}
            {salary && (
              <span className="inline-flex items-center gap-1 font-medium text-teal-700">
                <Wallet className="h-3 w-3" /> {salary}
              </span>
            )}
            {job.remote && (
              <span className="inline-flex items-center gap-1 font-medium text-sunset-700">
                <Radio className="h-3 w-3" /> Remote
              </span>
            )}
            {job.requiredSkills.length > 0 && (
              <span className="truncate">Skills: {job.requiredSkills.join(', ')}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <SaveJobButton jobId={job.id} />
            <CompareButton jobId={job.id} />
          </div>
          <RiskBadge tier={job.riskTier} backgroundCheckLikely={job.backgroundCheckLikely} />
          <span className="text-xs font-semibold text-teal-700 transition group-hover:translate-x-0.5">View →</span>
        </div>
      </Link>
    </li>
  );
}
