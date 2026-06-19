/**
 * Wraparound DOL/CareerOneStop intelligence for a participant — the labor-market
 * context a caseworker would otherwise open six tabs to gather: local wages for
 * the career goal, nearby American Job Centers, reentry programs, training/
 * apprenticeships, and license/cert requirements (with legal bars).
 *
 * Composes the existing typed client functions in lib/api.ts via allSettled, so
 * one slow/failed feed never blanks the panel. Results are cached in-memory
 * (TTL) keyed by goal+location; the route handlers themselves cache server-side.
 * Graceful degradation: AJC/reentry surface national fallbacks + the official
 * DOL finder when CareerOneStop isn't keyed; wages/licenses/apprenticeships
 * return demo data today and are labeled honestly by the UI.
 */
import {
  getCosWages, getCosLicenses, getCosApprenticeships,
  getAjcCenters, getReentryPrograms,
  type AjcCenter, type AjcCentersResponse,
} from './api';

export interface WageBand {
  rateType: string;
  pct10?: number; pct25?: number; median?: number; pct75?: number; pct90?: number;
}
export interface LicenseReq { title: string; region?: string; description?: string }
export interface Apprenticeship { title: string; sponsor?: string; region?: string }
export interface ReentryProgram { id: string; name: string; description?: string; url?: string; phone?: string; scope?: string }

export interface DolIntel {
  goal: string;
  location: string;
  wages: WageBand | null;
  centers: AjcCenter[];
  centersMeta?: { configured: boolean; finderUrl: string; message: string };
  reentry: ReentryProgram[];
  licenses: LicenseReq[];
  apprenticeships: Apprenticeship[];
  /** True if any live (keyed) source contributed; false = fallback/demo only. */
  liveData: boolean;
}

// ── parsing helpers (every API fn returns `unknown`) ──────────────────────
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function parseWages(data: unknown): WageBand | null {
  const list = arr(obj(obj(obj(data).OccupationDetail).Wages).NationalWagesList);
  const row = obj(list[0]);
  if (Object.keys(row).length === 0) return null;
  return {
    rateType: String(row.RateType ?? 'Annual'),
    pct10: num(row.Pct10), pct25: num(row.Pct25), median: num(row.Median),
    pct75: num(row.Pct75), pct90: num(row.Pct90),
  };
}

function parseLicenses(data: unknown): LicenseReq[] {
  return arr(obj(data).LicenseList).map((r) => {
    const o = obj(r);
    return { title: String(o.Title ?? ''), region: o.Region ? String(o.Region) : undefined, description: o.Description ? String(o.Description) : undefined };
  }).filter((l) => l.title);
}

function parseApprenticeships(data: unknown): Apprenticeship[] {
  return arr(obj(data).ApprenticeshipList).map((r) => {
    const o = obj(r);
    return { title: String(o.Title ?? ''), sponsor: o.Sponsor ? String(o.Sponsor) : undefined, region: o.Region ? String(o.Region) : undefined };
  }).filter((a) => a.title);
}

function parseReentry(data: unknown): ReentryProgram[] {
  return arr(data).map((r, i) => {
    const o = obj(r);
    return {
      id: String(o.ID ?? o.Id ?? `r${i}`),
      name: String(o.Name ?? o.ProgramName ?? ''),
      description: o.Description ? String(o.Description) : undefined,
      url: o.Url ? String(o.Url) : o.WebSiteUrl ? String(o.WebSiteUrl) : undefined,
      phone: o.Phone ? String(o.Phone) : undefined,
      scope: o.Scope ? String(o.Scope) : undefined,
    };
  }).filter((p) => p.name);
}

// ── TTL cache (browser-local, mirrors careeronestop.ts __cosCache) ────────
const TTL = 30 * 60 * 1000;
const cache = new Map<string, { expires: number; data: DolIntel }>();

export async function loadDolIntel(goal: string, location: string): Promise<DolIntel> {
  const key = `${goal}|${location}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  const kw = goal.trim() || 'general';
  const loc = location.trim();

  const [wagesR, licensesR, apprR, centersR, reentryR] = await Promise.allSettled([
    getCosWages(kw, loc),
    loc ? getCosLicenses(kw, loc) : Promise.resolve(null),
    loc ? getCosApprenticeships(kw, loc) : Promise.resolve(null),
    loc ? getAjcCenters(loc) : Promise.resolve(null),
    loc ? getReentryPrograms(loc) : Promise.resolve(null),
  ]);

  const val = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

  const centersRes = val(centersR) as AjcCentersResponse | null;
  const centers = centersRes?.OneStopCenterList ?? [];
  const centersMeta = centersRes?.meta;

  const data: DolIntel = {
    goal, location,
    wages: parseWages(val(wagesR)),
    centers,
    centersMeta,
    reentry: parseReentry(val(reentryR)),
    licenses: parseLicenses(val(licensesR)),
    apprenticeships: parseApprenticeships(val(apprR)),
    liveData: Boolean(centersMeta?.configured) || centers.length > 0,
  };

  cache.set(key, { expires: Date.now() + TTL, data });
  return data;
}

export function formatWage(n?: number): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString('en-US');
}
