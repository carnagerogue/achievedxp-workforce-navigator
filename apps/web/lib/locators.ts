/**
 * Free, no-key location locators backed by public ArcGIS services:
 *   - SNAP retailers  → USDA FNS SNAP Retailer Location data (no key)
 *   - Health centers  → HRSA Primary Health Care Facilities (no key, official)
 * Both are queried as a distance buffer around a coordinate, then sorted by
 * real distance. Pairs with the no-key geocoder so the whole chain needs zero
 * credentials. Server-side only.
 */
import type { LiveResource } from './treatment';

const SNAP_URL = 'https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/snap_retailer_location_data/FeatureServer/0';
const HRSA_URL = 'https://gisportal.hrsa.gov/server/rest/services/HealthCareFacilities/PrimaryHealthCareFacilities_FS/MapServer/0';

interface CacheEntry { expires: number; data: LiveResource[] }
const g = globalThis as unknown as { __locatorCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = g.__locatorCache ?? new Map();
g.__locatorCache = cache;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

const R_MI = 3958.8;
function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return R_MI * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const fmtMi = (mi: number) => (Number.isFinite(mi) ? String(Math.round(mi * 10) / 10) : undefined);

interface ArcFeature { attributes: Record<string, unknown>; geometry?: { x?: number; y?: number } }

/** Query an ArcGIS layer for features within `distanceMi` of a point (lat/lng in WGS84). */
async function arcgisNearby(serviceUrl: string, lat: number, lng: number, distanceMi: number, outFields: string, want: number): Promise<ArcFeature[]> {
  const params = new URLSearchParams({
    where: '1=1',
    geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPoint',
    distance: String(distanceMi),
    units: 'esriSRUnit_StatuteMile',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: String(want * 4),
    f: 'json',
  });
  try {
    const res = await fetch(`${serviceUrl}/query?${params.toString()}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: ArcFeature[] };
    return Array.isArray(json.features) ? json.features : [];
  } catch {
    return [];
  }
}

function withCache(key: string, fn: () => Promise<LiveResource[]>): Promise<LiveResource[]> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
  return fn().then((data) => { cache.set(key, { expires: Date.now() + 6 * 60 * 60_000, data }); return data; });
}

const str = (v: unknown) => (v == null ? '' : String(v));

/** Stores accepting SNAP/EBT near a coordinate, nearest first. */
export function findSnapRetailers(lat: number, lng: number, limit = 12): Promise<LiveResource[]> {
  return withCache(`snap:${lat.toFixed(3)},${lng.toFixed(3)},${limit}`, async () => {
    const feats = await arcgisNearby(SNAP_URL, lat, lng, 3, 'Store_Name,Store_Street_Address,City,State,Zip_Code,Store_Type,Latitude,Longitude', limit);
    return feats.map((f) => {
      const a = f.attributes;
      const la = f.geometry?.y ?? Number(a.Latitude);
      const ln = f.geometry?.x ?? Number(a.Longitude);
      const mi = haversineMi(lat, lng, la, ln);
      const type = str(a.Store_Type);
      return {
        id: `snap-${slug(`${str(a.Store_Name)}-${str(a.Store_Street_Address)}-${str(a.Zip_Code)}`)}`,
        name: str(a.Store_Name) || 'SNAP retailer',
        desc: 'Accepts SNAP / EBT' + (type ? ` · ${type.toLowerCase()}` : ''),
        address: str(a.Store_Street_Address) || undefined,
        cityState: [a.City, a.State, a.Zip_Code].map(str).filter(Boolean).join(', ') || undefined,
        distance: fmtMi(mi),
        _mi: mi,
      } as LiveResource & { _mi: number };
    })
      .sort((x, y) => (x as { _mi: number })._mi - (y as { _mi: number })._mi)
      .slice(0, limit)
      .map(({ _mi, ...r }) => r as LiveResource);
  });
}

/** HRSA-funded health centers (sliding-scale care) near a coordinate, nearest first. */
export function findHealthCenters(lat: number, lng: number, limit = 12): Promise<LiveResource[]> {
  return withCache(`hrsa:${lat.toFixed(3)},${lng.toFixed(3)},${limit}`, async () => {
    const feats = await arcgisNearby(HRSA_URL, lat, lng, 10, 'SITE_NM,SITE_ADDRESS,SITE_CITY,SITE_STATE_ABBR,SITE_ZIP_CD,SITE_PHONE_NUM,SITE_URL', limit);
    return feats.map((f) => {
      const a = f.attributes;
      const mi = haversineMi(lat, lng, f.geometry?.y ?? NaN, f.geometry?.x ?? NaN);
      const url = str(a.SITE_URL).trim();
      return {
        id: `hrsa-${slug(`${str(a.SITE_NM)}-${str(a.SITE_ADDRESS)}-${str(a.SITE_ZIP_CD)}`)}`,
        name: str(a.SITE_NM) || 'Health center',
        desc: 'Federally funded health center — care on a sliding scale, with or without insurance.',
        address: str(a.SITE_ADDRESS) || undefined,
        cityState: [a.SITE_CITY, a.SITE_STATE_ABBR, a.SITE_ZIP_CD].map(str).filter(Boolean).join(', ') || undefined,
        phone: str(a.SITE_PHONE_NUM) || undefined,
        url: url && url !== 'NULL' ? url : undefined,
        distance: fmtMi(mi),
        _mi: mi,
      } as LiveResource & { _mi: number };
    })
      .sort((x, y) => (x as { _mi: number })._mi - (y as { _mi: number })._mi)
      .slice(0, limit)
      .map(({ _mi, ...r }) => r as LiveResource);
  });
}
