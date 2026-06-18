import { NextResponse, type NextRequest } from 'next/server';
import {
  reentryPrograms,
  allReentryPrograms,
  isCareerOneStopConfigured,
  normalizeReentryList,
  NATIONAL_REENTRY_RESOURCES,
} from '../../../../../lib/careeronestop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const location = (req.nextUrl.searchParams.get('location') ?? '').trim();
  const radius = Number(req.nextUrl.searchParams.get('radius') ?? '100') || 100;

  // Live local reentry programs (DOL) when configured, then the curated
  // national directory so the tab is useful everywhere — local first.
  let local: Array<Record<string, unknown>> = [];
  if (isCareerOneStopConfigured() && location) {
    const raw = await reentryPrograms(location, radius);
    if (req.nextUrl.searchParams.get('debug') === '1') {
      const all = await allReentryPrograms();
      const allArr = normalizeReentryList(all);
      return NextResponse.json({
        __debug: true,
        finderType: Array.isArray(raw) ? 'array' : typeof raw,
        finderSample: raw,
        allType: Array.isArray(all) ? 'array' : typeof all,
        allCount: allArr.length,
        allSample: allArr.slice(0, 2),
        allKeys: allArr[0] ? Object.keys(allArr[0]) : [],
      });
    }
    local = normalizeReentryList(raw);
  }

  return NextResponse.json([...local, ...NATIONAL_REENTRY_RESOURCES]);
}
