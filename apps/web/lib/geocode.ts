/**
 * No-key geocoding — resolve a ZIP or "City, ST" to coordinates using only
 * free, public, no-API-key services so location-based lookups (like the SAMHSA
 * treatment locator) work with zero credentials:
 *   - ZIP        → Zippopotam.us (free, no key)
 *   - City/State → U.S. Census geocoder (free, no key, official)
 * Falls back to parsing a state code out of the input. Server-side only.
 */

export interface GeoPoint { lat: number | null; lng: number | null; state: string | null }

interface CacheEntry { expires: number; data: GeoPoint }
const g = globalThis as unknown as { __geoCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = g.__geoCache ?? new Map();
g.__geoCache = cache;

const stateFromText = (s: string): string | null => {
  const m = /,\s*([A-Za-z]{2})\b/.exec(s);
  return m ? m[1].toUpperCase() : null;
};

/** Resolve a location string to coordinates with no API key. */
export async function geocodeFree(location: string): Promise<GeoPoint> {
  const q = location.trim();
  if (!q) return { lat: null, lng: null, state: null };

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) return cached.data;

  let result: GeoPoint = { lat: null, lng: null, state: stateFromText(q) };

  try {
    if (/^\d{5}$/.test(q)) {
      // Zippopotam.us — ZIP → centroid lat/lng (free, no key).
      const r = await fetch(`https://api.zippopotam.us/us/${q}`, { headers: { Accept: 'application/json' } });
      if (r.ok) {
        const j = (await r.json()) as { places?: Array<{ latitude?: string; longitude?: string; 'state abbreviation'?: string }> };
        const p = j.places?.[0];
        if (p?.latitude && p?.longitude) {
          result = { lat: Number(p.latitude), lng: Number(p.longitude), state: p['state abbreviation'] ?? result.state };
        }
      }
    } else {
      // U.S. Census one-line geocoder — handles "City, ST" / full addresses (free, no key).
      const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.ok) {
        const j = (await r.json()) as { result?: { addressMatches?: Array<{ coordinates?: { x?: number; y?: number }; addressComponents?: { state?: string } }> } };
        const m = j.result?.addressMatches?.[0];
        if (m?.coordinates?.x != null && m.coordinates.y != null) {
          result = { lat: Number(m.coordinates.y), lng: Number(m.coordinates.x), state: m.addressComponents?.state ?? result.state };
        }
      }
    }
  } catch { /* network — fall through to state-only */ }

  cache.set(q, { expires: Date.now() + 24 * 60 * 60_000, data: result });
  return result;
}
