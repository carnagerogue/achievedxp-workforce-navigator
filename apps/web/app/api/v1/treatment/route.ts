import { NextResponse, type NextRequest } from 'next/server';
import { geocodeLocation } from '../../../../lib/careeronestop';
import { findTreatmentCenters } from '../../../../lib/treatment';

/**
 * Live, local substance-use & mental-health treatment facilities from SAMHSA's
 * FindTreatment.gov — a free U.S. government API with NO key required. The
 * location is resolved to coordinates with the no-key geocoder, so this works
 * with zero credentials.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const location = (req.nextUrl.searchParams.get('location') ?? '').trim();
  if (!location) return NextResponse.json({ source: null, results: [] });

  const { lat, lng } = await geocodeLocation(location);
  if (lat == null || lng == null) return NextResponse.json({ source: null, results: [] });

  const results = await findTreatmentCenters(lat, lng, 12);
  return NextResponse.json({
    source: results.length ? 'SAMHSA · findtreatment.gov' : null,
    results,
  });
}
