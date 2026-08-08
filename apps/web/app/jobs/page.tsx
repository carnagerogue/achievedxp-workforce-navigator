'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  ChevronDown,
  Sparkles,
  Compass,
  UserCircle2,
  ShieldCheck,
  Rocket,
} from 'lucide-react';
import { decisionFor, type JobDto, type OffenseType, type PaginatedJobsDto, type CompatibilityRating, type ConvictionType } from '@dxp/shared';
import { listJobs, updateRemoteJobPreference } from '../../lib/api';
import { DecisionBadge } from '../../components/decision/DecisionBadge';
import { scoreJobUnified } from '../../lib/job-scoring';
import { getLocalProfile, setLocalProfile as saveLocalProfile, type LocalProfile } from '../../lib/local-profile';
import { candidateProfilesFromStored, convictionTypesFor } from '../../lib/profile-store';
import { RiskBadge } from '../../components/RiskBadge';
import { SourceBadge } from '../../components/SourceBadge';
import { JobRowSkeleton } from '../../components/Skeleton';
import { SaveJobButton } from '../../components/SaveJobButton';
import { CompareButton } from '../../components/CompareButton';
import { CompatibilityDrawer } from '../../components/CompatibilityDrawer';
import { prettyDate, prettyIndustry, prettySalary } from '../../lib/format';
import { parseLocationInput } from '../../lib/location-parse';
import { useDebounce } from '../../lib/use-debounce';
import { getUserId } from '../../lib/session';
import { JourneyRail } from '../../components/JourneyRail';
import { RemoteJobsToggle } from '../../components/RemoteJobsToggle';
import { getJobSearchPreferences, setIncludeRemoteJobs as saveIncludeRemoteJobs } from '../../lib/job-search-preferences';
import { onStoreChange } from '../../lib/scoped-storage';

/**
 * Map between the legacy uppercase OffenseType (DB enum) and the lowercase
 * ConvictionType used by the dignity-centered compatibility engine.
 */
const OFFENSE_TO_CONVICTION: Record<OffenseType, ConvictionType> = {
  DRUG_POSSESSION:    'drug_possession',
  DRUG_DISTRIBUTION:  'drug_distribution',
  VIOLENT:            'violent_offense',
  REGISTRY_RELATED:   'registry_related',
  PROPERTY_THEFT:     'property_theft',
  PROPERTY_BURGLARY:  'burglary',
  FINANCIAL_FRAUD:    'financial_fraud',
  WEAPONS:            'weapons_related',
  DUI:                'dui_dwi',
  OTHER:              'other',
};

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

// User-facing conviction labels — match CONVICTION_LABELS in @dxp/shared.
// Selecting one re-ranks every visible job by computed compatibility score.
const OFFENSE_FILTERS: { value: OffenseType | ''; label: string }[] = [
  { value: '',                   label: 'No conviction filter — show all jobs' },
  { value: 'DRUG_POSSESSION',    label: 'Drug possession-related conviction' },
  { value: 'DRUG_DISTRIBUTION',  label: 'Drug distribution-related conviction' },
  { value: 'VIOLENT',            label: 'Violence-related conviction' },
  { value: 'PROPERTY_THEFT',     label: 'Property or theft-related conviction' },
  { value: 'PROPERTY_BURGLARY',  label: 'Burglary-related conviction' },
  { value: 'FINANCIAL_FRAUD',    label: 'Financial fraud-related conviction' },
  { value: 'WEAPONS',            label: 'Weapons-related conviction' },
  { value: 'DUI',                label: 'DUI/DWI-related conviction' },
  { value: 'REGISTRY_RELATED',   label: 'Registry-related conviction' },
  { value: 'OTHER',              label: 'Other conviction' },
];

type ChanceFilter = 'all' | 'high_only' | 'high_medium' | 'hide_low';

const CHANCE_FILTER_OPTIONS: { value: ChanceFilter; label: string }[] = [
  { value: 'all',          label: 'Show all (with explanations)' },
  { value: 'hide_low',     label: 'Hide Challenging Match' },
  { value: 'high_medium',  label: 'Strong + Possible Match only' },
  { value: 'high_only',    label: 'Strong Match only' },
];

const PAGE_SIZE = 50;

/**
 * Next.js 14 requires `useSearchParams()` to live under a Suspense
 * boundary when the consuming page is statically pre-rendered. We wrap
 * the real page component in Suspense at the default export so the
 * /jobs route can keep its prerender + still honor URL params.
 */
export default function JobsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <JobsPage />
    </Suspense>
  );
}

function JobsPage() {
  // Honor URL query params on first paint so deep links like /jobs?region=MN
  // (used by the U.S. coverage map and the bySource breakdown) actually
  // filter the catalog. Without this, the page would render unfiltered
  // and the user would see "wrong states" — every state click landed on
  // /jobs with no filter applied because we only read from text inputs.
  const sp = useSearchParams();
  const initialRegion       = sp?.get('region') ?? '';
  const initialIndustry     = sp?.get('industry') ?? '';
  const initialQ            = sp?.get('q') ?? '';
  const initialOffenseType  = (sp?.get('offenseType') as OffenseType | null) ?? '';
  const initialApprOnly     = sp?.get('apprenticeshipsOnly') === 'true';
  // Deep-link filters (e.g. from the Insights page "doorways").
  const initialFairChance   = sp?.get('hideFelonExclusions') === 'true';
  const initialRemote       = sp?.get('remote') === 'true';
  const initialIncludeRemote = initialRemote || sp?.get('includeRemote') !== 'false';
  const initialMinSalary    = Number(sp?.get('minSalary') ?? '') || 0;
  const initialPostedDays   = Number(sp?.get('postedWithinDays') ?? '') || 0;

  const [results, setResults] = useState<JobDto[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(initialQ);
  const [industry, setIndustry] = useState(initialIndustry);
  // When the URL specifies ?region=MN we seed the location text field so
  // the existing parser does the right thing AND the user sees the
  // active filter chip without needing to type anything.
  const [locationInput, setLocationInput] = useState(initialRegion);
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [offenseType, setOffenseType] = useState<OffenseType | ''>(initialOffenseType);
  const [hideClosedRecord, setHideClosedRecord] = useState(initialFairChance);
  const [minSalary, setMinSalary] = useState(initialMinSalary);
  const [postedWithinDays, setPostedWithinDays] = useState(initialPostedDays);
  const [remote, setRemote] = useState(initialRemote);
  const [includeRemoteJobs, setIncludeRemoteJobs] = useState(initialIncludeRemote);
  const [apprenticeshipsOnly, setApprenticeshipsOnly] = useState(initialApprOnly);
  const [chanceFilter, setChanceFilter] = useState<ChanceFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [drawerJob, setDrawerJob] = useState<{ job: JobDto; rating: CompatibilityRating } | null>(null);
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(null);
  const [userId, setCurrentUserId] = useState<string | null>(null);

  // Load the saved profile so browse scores with the user's real background
  // (the same shared scorer the dashboard uses) — not conviction-only. Default
  // the conviction filter from their record when the URL doesn't set one, and
  // seed the location filter from their saved city/region the same way.
  useEffect(() => {
    const hydrateScopedPreferences = () => {
      const p = getLocalProfile();
      setLocalProfile(p);
      setCurrentUserId(getUserId());
      if (!sp?.has('includeRemote')) {
        setIncludeRemoteJobs(p?.includeRemoteJobs ?? getJobSearchPreferences().includeRemoteJobs);
      }
      const fromProfile = p?.convictions?.[0]?.offenseType;
      if (fromProfile && !sp?.get('offenseType')) setOffenseType(fromProfile as OffenseType);
      if (!sp?.get('region') && !sp?.get('postalCode')) {
        // ZIP is the only profile value that supports an honest proximity
        // radius. Prefer it over city/state, which otherwise expands to a broad
        // statewide result set while looking like a "near me" search.
        const loc = p?.locationPostalCode
          ?? (p?.locationCity && p?.locationRegion ? `${p.locationCity}, ${p.locationRegion}` : p?.locationRegion ?? '');
        if (loc) setLocationInput((cur) => (cur === '' ? loc : cur));
      }
    };

    hydrateScopedPreferences();
    return onStoreChange(hydrateScopedPreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateIncludeRemoteJobs = (next: boolean) => {
    setIncludeRemoteJobs(next);
    saveIncludeRemoteJobs(next);
    if (!next) setRemote(false);

    if (localProfile) {
      const updated: LocalProfile = { ...localProfile, includeRemoteJobs: next };
      setLocalProfile(updated);
      saveLocalProfile(updated);
      void updateRemoteJobPreference({ userId: updated.userId, includeRemoteJobs: next }).catch(() => {
        // The local preference remains effective even if account sync is
        // temporarily unavailable; the next onboarding save reconciles it.
      });
    }
  };

  const scoreInputs = useMemo(() => {
    if (offenseType) {
      const ct = OFFENSE_TO_CONVICTION[offenseType];
      return { candidates: [{ convictionType: ct }], convictionTypes: [ct as string], profile: localProfile, hasConvictions: true };
    }
    if (localProfile) {
      return {
        candidates: candidateProfilesFromStored(localProfile),
        convictionTypes: convictionTypesFor(localProfile),
        profile: localProfile,
        hasConvictions: (localProfile.convictions?.length ?? 0) > 0,
      };
    }
    return { candidates: [], convictionTypes: [], profile: null, hasConvictions: false };
  }, [offenseType, localProfile]);

  const hasCompatibilityContext = Boolean(
    offenseType || (localProfile?.convictions?.length ?? 0) > 0,
  );

  // Debounce the text inputs so we don't hit the API on every keystroke.
  // 300ms feels instant but eliminates burst requests.
  const dq        = useDebounce(q, 300);
  const dLocation = useDebounce(locationInput, 300);

  const locationFilter = useMemo(() => parseLocationInput(dLocation), [dLocation]);

  // One signature for the whole filter set. Pagination is keyed off (queryKey,
  // offset) in a single effect so a filter change can't race a stale `offset`
  // into a wrong-page append + redundant fetch (was two effects sharing deps).
  const queryKey = useMemo(
    () => JSON.stringify([dq, industry, locationFilter, radiusMiles, offenseType, hideClosedRecord, minSalary, postedWithinDays, remote, includeRemoteJobs, apprenticeshipsOnly, userId]),
    [dq, industry, locationFilter, radiusMiles, offenseType, hideClosedRecord, minSalary, postedWithinDays, remote, includeRemoteJobs, apprenticeshipsOnly, userId],
  );
  const prevQueryKey = useRef(queryKey);

  useEffect(() => {
    const queryChanged = prevQueryKey.current !== queryKey;
    // Filter changed while paged past the first page: reset to page 0 and let
    // the offset change re-run this effect once. No fetch on this pass.
    if (queryChanged && offset !== 0) {
      prevQueryKey.current = queryKey;
      setResults([]);
      setOffset(0);
      return;
    }
    prevQueryKey.current = queryKey;
    const isFirstPage = offset === 0;
    if (queryChanged) setResults([]);
    if (isFirstPage) setLoading(true); else setLoadingMore(true);
    setError(null);

    listJobs({
      q: dq || undefined,
      industry: industry || undefined,
      // Remote ignores geography entirely — location + radius are irrelevant.
      city:       remote ? undefined : locationFilter.city,
      region:     remote ? undefined : locationFilter.region,
      postalCode: remote ? undefined : locationFilter.postalCode,
      radiusMiles: !remote && locationFilter.postalCode ? radiusMiles : undefined,
      offenseType: offenseType || undefined,
      hideFelonExclusions: hideClosedRecord || undefined,
      minSalary: minSalary || undefined,
      postedWithinDays: postedWithinDays || undefined,
      includeRemote: remote ? true : includeRemoteJobs,
      remote: remote || undefined,
      apprenticeshipsOnly: apprenticeshipsOnly || undefined,
      userId: userId || undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, offset]);

  const loadMore = () => setOffset(results.length);
  const hasMore = results.length < total;

  /**
   * The API has already ranked the entire filtered pool before pagination.
   * Compute ratings here only for explanation UI; never re-sort this page,
   * otherwise page 2 could outrank page 1 without the user seeing it.
   */
  const scoredResults = useMemo(() => {
    return results.map((job) => {
      if (!hasCompatibilityContext) return { job, rating: null };
      const u = scoreJobUnified(scoreInputs, job);
      // Overlay the unified score/chance/label onto the rating so the chip and
      // sort reflect the blended (conviction + realistic-fit + barriers) result
      // — identical to the dashboard — while the drawer keeps the full breakdown.
      const rating = { ...u.rating, score: u.score, chance: u.chance, label: u.label } as CompatibilityRating;
      return { job, rating };
    });
  }, [results, scoreInputs, hasCompatibilityContext]);

  /** Apply the chance-band filter. Even when hiding, surface a count so users know jobs were filtered. */
  const visibleResults = useMemo(() => {
    if (chanceFilter === 'all') return scoredResults;
    return scoredResults.filter(({ rating }) => {
      if (!rating) return true;
      if (chanceFilter === 'high_only')   return rating.chance === 'high';
      if (chanceFilter === 'high_medium') return rating.chance !== 'low';
      if (chanceFilter === 'hide_low')    return rating.chance !== 'low';
      return true;
    });
  }, [scoredResults, chanceFilter]);

  const hiddenLowCount = scoredResults.length - visibleResults.length;
  const activeConviction = offenseType
    ? OFFENSE_TO_CONVICTION[offenseType]
    : scoreInputs.candidates.find((candidate) => candidate.convictionType)?.convictionType ?? null;

  // Active-filter chip descriptors used in the summary row below the filter card.
  const activeChips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (dq)             activeChips.push({ key: 'q',        label: `Search: "${dq}"`,                     onClear: () => setQ('') });
  if (industry)       activeChips.push({ key: 'industry', label: `Industry: ${prettyIndustry(industry)}`, onClear: () => setIndustry('') });
  if (remote) {
    // Remote ignores geography — don't surface a location chip.
  } else if (locationFilter.postalCode) {
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
  if (remote)         activeChips.push({ key: 'remote', label: 'Remote only', onClear: () => setRemote(false) });
  if (!includeRemoteJobs) activeChips.push({ key: 'no-remote', label: 'Remote jobs off', onClear: () => updateIncludeRemoteJobs(true) });
  if (apprenticeshipsOnly) activeChips.push({ key: 'appr', label: 'Apprenticeships only', onClear: () => setApprenticeshipsOnly(false) });

  const clearAll = () => {
    setQ(''); setIndustry(''); setLocationInput(''); setOffenseType('');
    setHideClosedRecord(false); setMinSalary(0); setPostedWithinDays(0);
    setRemote(false); updateIncludeRemoteJobs(true); setApprenticeshipsOnly(false);
  };

  return (
    <div className="constellation-workspace animate-fade-in">
      <JourneyRail active="work" />
      <div className="mb-6">
        <p className="section-kicker text-sunset-600">Phase 04 · Find work</p>
        <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[.82] tracking-[-.04em] text-navy-900 sm:text-7xl">Find work that fits.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Search active postings across every source. Add a profile or optional background context when you want personalized fit guidance.
        </p>
      </div>

      {/* ─────────── Guided entry points ─────────── */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Start here</p>
        <div className="flex flex-wrap gap-2">
          {localProfile ? (
            <GuidedChip Icon={UserCircle2} label="Use my profile" active={false} onClick={() => {
              setRemote(false);
              if (localProfile.desiredIndustries?.[0]) setIndustry(localProfile.desiredIndustries[0]);
              setLocationInput(localProfile.locationPostalCode || localProfile.locationRegion || '');
            }} />
          ) : (
            <Link href="/onboarding" className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-700"><UserCircle2 className="h-3.5 w-3.5" /> Set up my profile</Link>
          )}
          <GuidedChip Icon={MapPin} label="Search near me" active={!remote && !!locationFilter.postalCode} onClick={() => { setRemote(false); setShowFilters(true); }} />
          <GuidedChip Icon={Radio} label="Work from anywhere" active={remote} onClick={() => {
            if (!remote) updateIncludeRemoteJobs(true);
            setRemote((v) => !v);
          }} />
          <GuidedChip Icon={HardHat} label="Find apprenticeships" active={apprenticeshipsOnly} onClick={() => setApprenticeshipsOnly((v) => !v)} />
          <Link href="/entrepreneurship" className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-700"><Rocket className="h-3.5 w-3.5" /> Be your own boss</Link>
          <GuidedChip Icon={ShieldCheck} label="Lower-barrier roles" active={hideClosedRecord} onClick={() => setHideClosedRecord((v) => !v)} />
          <GuidedChip Icon={Compass} label="Explore all jobs" active={false} onClick={() => {
            setQ(''); setIndustry(''); setLocationInput(''); setOffenseType(''); setHideClosedRecord(false);
            setMinSalary(0); setPostedWithinDays(0); setRemote(false); updateIncludeRemoteJobs(true); setApprenticeshipsOnly(false); setShowFilters(false);
          }} />
        </div>
      </div>

      {/* ─────────── Filter card ─────────── */}
      <div className="navigator-panel mb-5 rounded-2xl border border-navy-900/20 bg-white/55 p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex min-h-12 flex-1 items-center justify-between gap-2 text-left text-sm font-semibold text-navy-900"
            aria-expanded={showFilters}
          >
            <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-teal-600" /> More filters{activeChips.length ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700">{activeChips.length} active</span> : null}</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition sm:mr-3 ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <RemoteJobsToggle
            checked={includeRemoteJobs}
            onChange={updateIncludeRemoteJobs}
            compact
            className="sm:w-[290px]"
          />
        </div>
        {showFilters && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
              value={remote ? '' : locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              disabled={remote}
              placeholder={remote ? 'Not used for remote roles' : 'ZIP, city, or state'}
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
            {remote
              ? <p className="mt-1 text-xs text-slate-500">Remote is on — location &amp; radius don’t apply.</p>
              : <LocationHint filter={locationFilter} />}
          </FilterField>

          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-slate-500" />
                Radius
              </span>
              <span className="font-semibold text-teal-700">
                {remote ? 'not used for remote' : locationFilter.postalCode ? `${radiusMiles} miles` : 'enter a ZIP to use'}
              </span>
            </span>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={radiusMiles}
              disabled={remote || !locationFilter.postalCode}
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

          <FilterField label="Conviction history" Icon={Scale}>
            <select
              value={offenseType}
              onChange={(e) => setOffenseType(e.target.value as OffenseType | '')}
              className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {OFFENSE_FILTERS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {offenseType && (
              <span className="mt-1 block text-[11px] text-teal-700">
                Each job is being scored for compatibility with the selected conviction.
              </span>
            )}
          </FilterField>

          {hasCompatibilityContext && (
            <FilterField label="Compatibility filter" Icon={Scale}>
              <select
                value={chanceFilter}
                onChange={(e) => setChanceFilter(e.target.value as ChanceFilter)}
                className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {CHANCE_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FilterField>
          )}

          <div className="grid gap-3 sm:col-span-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-sm text-slate-700 transition hover:bg-sky-50">
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => {
                  if (e.target.checked) updateIncludeRemoteJobs(true);
                  setRemote(e.target.checked);
                }}
                className="h-4 w-4 rounded border-sky-400 text-sky-600 focus:ring-sky-500"
              />
              <Radio className="h-4 w-4 text-sky-600" />
              <span className="font-medium text-slate-800">Remote only — anywhere, no location needed</span>
            </label>
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
        )}
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
        <ul className="jobs-list divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          {Array.from({ length: 6 }).map((_, i) => <JobRowSkeleton key={i} />)}
        </ul>
      ) : results.length === 0 ? (
        <EmptyState hasFilters={activeChips.length > 0} location={locationInput} onClear={clearAll} />
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            <strong className="font-semibold text-navy-900">{total.toLocaleString()}</strong> total
            <span className="mx-1.5 text-slate-300">·</span>
            showing {visibleResults.length.toLocaleString()}
            {hasCompatibilityContext && hiddenLowCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {hiddenLowCount} hidden by compatibility filter
              </span>
            )}
          </p>
          <ul className="jobs-list divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            {visibleResults.map(({ job, rating }) => (
              <JobRow
                key={job.id}
                job={job}
                rating={rating}
                onOpenDetails={(r) => setDrawerJob({ job, rating: r })}
              />
            ))}
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

      <CompatibilityDrawer
        open={!!drawerJob}
        onClose={() => setDrawerJob(null)}
        rating={drawerJob?.rating ?? null}
        jobTitle={drawerJob?.job.title ?? ''}
        company={drawerJob?.job.company ?? ''}
        conviction={activeConviction}
        job={drawerJob ? {
          id: drawerJob.job.id,
          title: drawerJob.job.title,
          company: drawerJob.job.company,
          description: drawerJob.job.description,
          industry: drawerJob.job.industry,
          riskTier: drawerJob.job.riskTier,
          excludesFelons: drawerJob.job.excludesFelons,
          backgroundCheckLikely: drawerJob.job.backgroundCheckLikely,
          isApprenticeship: drawerJob.job.isApprenticeship,
          remote: drawerJob.job.remote,
          locationRegion: drawerJob.job.locationRegion,
          locationCity: drawerJob.job.locationCity,
          requiredSkills: drawerJob.job.requiredSkills,
          requiredCertifications: drawerJob.job.requiredCertifications,
        } : undefined}
        candidate={activeConviction ? { convictionType: activeConviction } : undefined}
      />
    </div>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof SearchIcon;
function GuidedChip({ Icon, label, active, onClick }: { Icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
        (active ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700')
      }
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

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
              ? <>We may not yet have postings in <strong>&ldquo;{location}&rdquo;</strong>. Our providers ingest by keyword, so some metro areas aren&apos;t represented yet. Try a nearby ZIP, a state, or clearing the location filter.</>
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
        <>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            There are no jobs to show right now. Check back soon — or start with your plan and other ways to work.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">Start here</Link>
            <Link href="/apprenticeships" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-700">Apprenticeships</Link>
          </div>
        </>
      )}
    </div>
  );
}

function JobRow({
  job,
  rating,
  onOpenDetails,
}: {
  job: JobDto;
  rating: CompatibilityRating | null;
  onOpenDetails: (rating: CompatibilityRating) => void;
}) {
  const cityRegion = [job.locationCity, job.locationRegion].filter(Boolean).join(', ');
  const location = cityRegion
    ? (job.locationPostalCode ? `${cityRegion} ${job.locationPostalCode}` : cityRegion)
    : 'Location TBD';
  const salary = prettySalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const decision = decisionFor(job, { convictionSelected: rating !== null });

  return (
    <li className="group relative transition-colors hover:bg-slate-50/70">
      {/* Vertical accent rule on hover — gives each row an immediate sense
          of focus without a full-row outline. Subtle but unmistakable. */}
      <span className="pointer-events-none absolute inset-y-2 left-0 w-0.5 origin-left scale-y-0 rounded-r bg-gradient-to-b from-teal-500 to-teal-700 transition-transform duration-200 group-hover:scale-y-100" aria-hidden />
      <div className="flex items-start justify-between gap-4 p-4 pl-5">
        <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-sm font-semibold text-navy-900 transition-colors group-hover:text-teal-700">
              {job.title}
            </h3>
            <SourceBadge code={job.sourceCode} />
            {job.isApprenticeship && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sunset-200 bg-sunset-50 px-2 py-0.5 text-[11px] font-medium text-sunset-700">
                <HardHat className="h-3 w-3" /> Apprenticeship
              </span>
            )}
            {job.remote && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                <Radio className="h-3 w-3" /> Remote
              </span>
            )}
            <DecisionBadge band={decision.band} label={decision.label} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-slate-600">
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
              <span className="inline-flex items-center gap-1 rounded-md border border-teal-200/70 bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">
                <Wallet className="h-3 w-3" /> {salary}
              </span>
            )}
            {job.requiredSkills.length > 0 && (
              <span className="truncate text-slate-500">Skills: {job.requiredSkills.join(', ')}</span>
            )}
          </div>
          <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-relaxed text-slate-600">
            <span className="font-medium text-slate-700">Why:</span> {decision.reason}
          </p>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <SaveJobButton jobId={job.id} />
            <CompareButton jobId={job.id} />
          </div>
          {rating ? (
            <CompatibilityChip rating={rating} onOpen={() => onOpenDetails(rating)} />
          ) : (
            <RiskBadge tier={job.riskTier} backgroundCheckLikely={job.backgroundCheckLikely} />
          )}
          <Link
            href={`/jobs/${job.id}`}
            className="text-xs font-semibold text-teal-700 transition-transform group-hover:translate-x-0.5"
          >
            View →
          </Link>
        </div>
      </div>
    </li>
  );
}

/**
 * Compatibility pill — clickable, opens the drawer with the full breakdown.
 * Color-coded by chance band; uses dignity-centered language only.
 */
function CompatibilityChip({ rating, onOpen }: { rating: CompatibilityRating; onOpen: () => void }) {
  const styles = {
    high:   'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]',
    medium: 'border-amber-300   bg-amber-50   text-amber-800   hover:border-amber-400   hover:bg-amber-100   hover:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]',
    low:    'border-rose-300    bg-rose-50    text-rose-800    hover:border-rose-400    hover:bg-rose-100    hover:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]',
  } as const;
  const dotStyles = {
    high:   'bg-emerald-500',
    medium: 'bg-amber-500',
    low:    'bg-rose-500',
  } as const;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${styles[rating.chance]}`}
      aria-label={`${rating.label} — ${rating.score}%. Click for details.`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotStyles[rating.chance]}`} />
      {rating.label} · {rating.score}%
      <span aria-hidden className="text-[9px] opacity-60">▸</span>
    </button>
  );
}
