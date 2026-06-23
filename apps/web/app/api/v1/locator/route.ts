import { NextResponse, type NextRequest } from 'next/server';
import { geocodeLocation } from '../../../../lib/careeronestop';
import { findSnapRetailers, findHealthCenters } from '../../../../lib/locators';
import type { LiveResource } from '../../../../lib/treatment';

/**
 * Live local resource locators from free, no-key public services:
 *   kind=snap   → USDA SNAP retailers
 *   kind=clinic → HRSA free / low-cost health centers
 * Location resolved with the no-key geocoder, so no credentials are required.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCES: Record<string, { source: string; find: (lat: number, lng: number, limit: number) => Promise<LiveResource[]> }> = {
  snap: { source: 'USDA · SNAP retailers', find: findSnapRetailers },
  clinic: { source: 'HRSA · health centers', find: findHealthCenters },
};

export async function GET(req: NextRequest) {
  const kind = (req.nextUrl.searchParams.get('kind') ?? '').trim();
  const location = (req.nextUrl.searchParams.get('location') ?? '').trim();
  const cfg = SOURCES[kind];
  if (!cfg || !location) return NextResponse.json({ source: null, results: [] });

  const { lat, lng } = await geocodeLocation(location);
  if (lat == null || lng == null) return NextResponse.json({ source: null, results: [] });

  const results = await cfg.find(lat, lng, 12);
  return NextResponse.json({ source: results.length ? cfg.source : null, results });
}
