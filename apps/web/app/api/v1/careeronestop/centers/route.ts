import { NextResponse, type NextRequest } from 'next/server';
import {
  americanJobCenters,
  isCareerOneStopConfigured,
  officialAjcFinderUrl,
  type AjcCentersResponse,
} from '../../../../../lib/careeronestop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const location = (req.nextUrl.searchParams.get('location') ?? '').trim();
  const radius = Number(req.nextUrl.searchParams.get('radius') ?? '50') || 50;

  if (!location) {
    return NextResponse.json({ OneStopCenterList: [], RecordCount: 0 } satisfies AjcCentersResponse);
  }

  // Real U.S. DOL data when credentials are configured.
  if (isCareerOneStopConfigured()) {
    const data = await americanJobCenters(location, radius);
    if (data && Array.isArray(data.OneStopCenterList) && data.OneStopCenterList.length > 0) {
      return NextResponse.json(data);
    }
  }

  // Honest fallback: no invented centers — point at the official finder for
  // exactly this location so the user still gets real, actionable results.
  const configured = isCareerOneStopConfigured();
  return NextResponse.json({
    OneStopCenterList: [],
    RecordCount: 0,
    meta: {
      configured,
      finderUrl: officialAjcFinderUrl(location, radius),
      message: configured
        ? 'No American Job Centers matched in that area. Try a wider radius or the official finder.'
        : 'Live center data needs a CareerOneStop API key. Use the official U.S. Department of Labor finder for centers near you.',
    },
  } satisfies AjcCentersResponse);
}
