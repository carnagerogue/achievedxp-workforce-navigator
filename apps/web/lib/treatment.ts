/**
 * SAMHSA FindTreatment.gov — real, local substance-use & mental-health
 * treatment facilities. Free public U.S. government API, no key required.
 * Needs coordinates (a bare ZIP mis-geocodes), so callers pass lat/long
 * resolved via geocodeLocation().
 */

export interface LiveResource {
  id: string;
  name: string;
  desc?: string;
  address?: string;
  cityState?: string;
  phone?: string;
  url?: string;
  distance?: string;
}

interface CacheEntry { expires: number; data: LiveResource[] }
const g = globalThis as unknown as { __samhsaCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = g.__samhsaCache ?? new Map();
g.__samhsaCache = cache;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

interface SamhsaRow {
  name1?: string; name2?: string;
  street1?: string; street2?: string;
  city?: string; state?: string; zip?: string;
  phone?: string; website?: string;
  miles?: number | string;
}

/** Treatment / recovery facilities near a coordinate, nearest first. */
export async function findTreatmentCenters(lat: number, lng: number, limit = 8): Promise<LiveResource[]> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${limit}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.data;

  const url = `https://findtreatment.gov/locator/exportsAsJson/v2?sAddr=${lat},${lng}&sType=SA&pageSize=${limit}&page=1`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'AchieveDXP/1.0' } });
    if (!res.ok) return [];
    const json = (await res.json()) as { rows?: SamhsaRow[] };
    const rows = Array.isArray(json.rows) ? json.rows : [];
    const out: LiveResource[] = rows.slice(0, limit).map((r) => {
      const name = [r.name1, r.name2].filter(Boolean).join(' — ') || 'Treatment facility';
      const miles = typeof r.miles === 'number' ? r.miles : Number(r.miles);
      return {
        id: `samhsa-${slug(`${r.name1 ?? ''}-${r.street1 ?? ''}-${r.zip ?? ''}`)}`,
        name,
        desc: 'Substance-use & mental-health treatment — SAMHSA-listed facility.',
        address: [r.street1, r.street2].filter(Boolean).join(', ') || undefined,
        cityState: [r.city, r.state, r.zip].filter(Boolean).join(', ') || undefined,
        phone: r.phone || undefined,
        url: r.website || undefined,
        distance: Number.isFinite(miles) ? String(Math.round((miles as number) * 10) / 10) : undefined,
      };
    });
    cache.set(key, { expires: now + 6 * 60 * 60_000, data: out });
    return out;
  } catch {
    return [];
  }
}
