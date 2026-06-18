import { NextResponse, type NextRequest } from 'next/server';
import {
  reentryProgramsNear,
  isCareerOneStopConfigured,
  NATIONAL_REENTRY_RESOURCES,
} from '../../../../../lib/careeronestop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const location = (req.nextUrl.searchParams.get('location') ?? '').trim();
  const radius = Number(req.nextUrl.searchParams.get('radius') ?? '100') || 100;

  // Real local reentry programs (DOL), nearest first, then the curated
  // national directory so the tab is useful in every area.
  let local: Array<Record<string, unknown>> = [];
  if (isCareerOneStopConfigured() && location) {
    try {
      local = await reentryProgramsNear(location, radius);
    } catch {
      local = [];
    }
  }

  return NextResponse.json([...local, ...NATIONAL_REENTRY_RESOURCES]);
}
