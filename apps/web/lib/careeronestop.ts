/**
 * CareerOneStop (U.S. Department of Labor) client for the web app.
 *
 * The deployed site previously returned hardcoded Seattle "WorkSource"
 * centers for every query — it ignored the location entirely, so a Cleveland
 * ZIP showed Washington-state offices with fake phone numbers. This client
 * calls the real DOL API, which geocodes the location server-side and returns
 * actual American Job Centers and reentry programs with real distances.
 *
 * Credentials live in env (COS_USER_ID + COS_TOKEN) — free to register at
 * careeronestop.org/Developers/WebAPI/registration.aspx. When they're absent
 * the routes fall back to the official finder deep-link + a curated national
 * reentry directory rather than inventing data.
 *
 * URL templates verified against the CareerOneStop Web API docs:
 *   https://www.careeronestop.org/Developers/WebAPI/technical-information.aspx
 */

const BASE = 'https://api.careeronestop.org/v1';

interface CacheEntry { expires: number; data: unknown }
// Pin the cache to globalThis so it's shared across route handlers / reloads.
const g = globalThis as unknown as { __cosCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = g.__cosCache ?? new Map();
g.__cosCache = cache;

function creds(): { userId: string; token: string } {
  return { userId: process.env.COS_USER_ID ?? '', token: process.env.COS_TOKEN ?? '' };
}

export function isCareerOneStopConfigured(): boolean {
  const { userId, token } = creds();
  return Boolean(userId && token);
}

const seg = (s: string | number | null | undefined): string =>
  encodeURIComponent(String(s ?? '').trim() || '0');

async function fetchJson<T>(path: string, ttlMs: number): Promise<T | null> {
  if (!isCareerOneStopConfigured()) return null;
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expires > now) return cached.data as T;

  const { token } = creds();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const text = await res.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { data = null; }
    if (data == null) {
      // 404 from CareerOneStop frequently means "no records matched" — cache
      // the miss briefly so we don't hammer the API on a bad area.
      cache.set(path, { expires: now + 60_000, data: null });
      return null;
    }
    cache.set(path, { expires: now + ttlMs, data });
    return data as T;
  } catch {
    return null;
  }
}

export interface AjcCenter {
  ID: string;
  Name: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  StateAbbr?: string;
  Zip?: string;
  Phone?: string;
  Distance?: string;
  OpenHour?: string;
  WebSiteUrl?: string;
  Latitude?: number;
  Longitude?: number;
}

export interface AjcCentersResponse {
  OneStopCenterList?: AjcCenter[];
  RecordCount?: number;
  AreaValidationErr?: string;
  error?: string;
  partial?: boolean;
  meta?: { configured: boolean; finderUrl: string; message: string };
}

/** American Job Centers near a location (ZIP or "City, ST"). */
export async function americanJobCenters(location: string, radius = 50, limit = 25): Promise<AjcCentersResponse | null> {
  const { userId } = creds();
  const path = `/ajcfinder/${seg(userId)}/${seg(location)}/${radius}/0/0/0/0/Distance/asc/0/${limit}`;
  return fetchJson<AjcCentersResponse>(path, 6 * 60 * 60_000);
}

/** Reentry programs near a location (justice-impacted candidates). */
export async function reentryPrograms(location: string, radius = 50, limit = 25): Promise<unknown> {
  const { userId } = creds();
  const path = `/reentryprogramfinder/${seg(userId)}/${seg(location)}/${radius}/CountyName/asc/0/${limit}`;
  return fetchJson<unknown>(path, 6 * 60 * 60_000);
}

/** The full DOL reentry-program dataset (no location filter). Cached hard. */
export async function allReentryPrograms(): Promise<unknown> {
  const { userId } = creds();
  return fetchJson<unknown>(`/reentryprogramfinder/${seg(userId)}?enableMetaData=false`, 12 * 60 * 60_000);
}

/** Deep-link into the official DOL American Job Center finder for a location. */
export function officialAjcFinderUrl(location: string, radius = 50): string {
  const loc = encodeURIComponent((location || '').trim());
  return `https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx?keyword=&location=${loc}&radius=${radius}&ajctype=0&persgroup=0&curPage=1`;
}

/**
 * Curated, verified national reentry organizations. Always shown alongside
 * (or in place of) live local results so the reentry tab is useful in every
 * area — many regions have American Job Centers but few specifically-tagged
 * reentry programs in the DOL feed.
 */
export const NATIONAL_REENTRY_RESOURCES: Array<Record<string, unknown>> = [
  {
    ID: 'nat-ceo',
    Name: 'Center for Employment Opportunities (CEO)',
    Description: 'Immediate, paid transitional work, job-readiness training, and full-time job placement for people recently released from incarceration. Operates in cities across the U.S.',
    Url: 'https://ceoworks.org',
    Services: ['Transitional jobs', 'Job placement', 'Coaching'],
    Scope: 'National',
  },
  {
    ID: 'nat-fortune',
    Name: 'The Fortune Society',
    Description: 'Reentry services including employment, housing, education, and counseling for people with criminal records.',
    Url: 'https://fortunesociety.org',
    Services: ['Employment', 'Housing', 'Education', 'Counseling'],
    Scope: 'National',
  },
  {
    ID: 'nat-goodwill',
    Name: 'Goodwill Career Centers',
    Description: 'Free job training, résumé help, digital-skills classes, and placement services at local Goodwill career centers nationwide. Many run dedicated reentry programs.',
    Url: 'https://www.goodwill.org/jobs-training/',
    Services: ['Job training', 'Résumé help', 'Placement'],
    Scope: 'National',
  },
  {
    ID: 'nat-nrrc',
    Name: 'National Reentry Resource Center',
    Description: 'Federally funded clearinghouse of reentry programs, state-by-state guides, and service directories.',
    Url: 'https://nationalreentryresourcecenter.org',
    Services: ['Resource directory', 'State guides'],
    Scope: 'National',
  },
  {
    ID: 'nat-211',
    Name: '211 (United Way)',
    Description: 'Dial 211 for free, confidential referrals to local housing, food, employment, and reentry support — available 24/7 in most of the U.S.',
    Url: 'https://www.211.org',
    Phone: '211',
    Services: ['Housing', 'Food', 'Local referrals'],
    Scope: 'National',
  },
  {
    ID: 'nat-ajc-finder',
    Name: 'American Job Center Finder (DOL)',
    Description: 'Official U.S. Department of Labor directory of American Job Centers offering free job search, training, and benefits help.',
    Url: 'https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx',
    Services: ['Job search', 'Training', 'Benefits'],
    Scope: 'National',
  },
];

function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Real local reentry programs near a location.
 *
 * The DOL location-filtered reentry endpoint returns "no matches" everywhere
 * (a known quirk), but the full dataset (~2,500 programs, each with state +
 * lat/long) is available. So we pull the full set, geocode the user's
 * location via the AJC finder (which reliably resolves a ZIP / "City, ST" to
 * a state + coordinates), filter to that state, and sort by real distance.
 */
export async function reentryProgramsNear(location: string, radius = 100, limit = 25): Promise<Array<Record<string, unknown>>> {
  if (!isCareerOneStopConfigured() || !location.trim()) return [];

  const all = normalizeReentryList(await allReentryPrograms());
  if (all.length === 0) return [];

  // Geocode via the AJC finder's nearest center (state + coords anchor).
  const ajc = await americanJobCenters(location, 50, 1);
  const top = ajc?.OneStopCenterList?.[0];
  let state = top?.StateAbbr ?? null;
  const aLat = typeof top?.Latitude === 'number' ? top.Latitude : null;
  const aLng = typeof top?.Longitude === 'number' ? top.Longitude : null;
  if (!state) {
    const m = /,\s*([A-Za-z]{2})\b/.exec(location);
    if (m) state = m[1].toUpperCase();
  }
  if (!state) return [];

  const inState = all.filter((p) => String(p.StateAbbr ?? '').toUpperCase() === state);

  if (aLat != null && aLng != null) {
    return inState
      .map((p) => {
        const lat = Number(p.Latitude);
        const lng = Number(p.Longitude);
        const d = Number.isFinite(lat) && Number.isFinite(lng) ? haversineMiles(aLat, aLng, lat, lng) : Number.POSITIVE_INFINITY;
        return { p, d };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map(({ p, d }) => ({ ...p, Distance: Number.isFinite(d) ? String(Math.round(d * 10) / 10) : '' }));
  }

  return inState.slice(0, limit);
}

/** Normalize the varied CareerOneStop reentry response into a flat record array. */
export function normalizeReentryList(data: unknown): Array<Record<string, unknown>> {
  let arr: unknown[] = [];
  if (Array.isArray(data)) arr = data;
  else if (data && typeof data === 'object') {
    for (const v of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(v)) { arr = v; break; }
    }
  }
  return arr.filter(
    (p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object' && !('Error' in (p as object)),
  );
}
