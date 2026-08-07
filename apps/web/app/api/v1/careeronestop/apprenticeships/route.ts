import { NextResponse, type NextRequest } from 'next/server';
import { apprenticeshipOffices, careerOneStopUnavailable } from '../../../../../lib/careeronestop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const location = sp.get('location') ?? '';
  const radius = Number(sp.get('radius') ?? 100);
  const data = await apprenticeshipOffices(location, Number.isFinite(radius) ? radius : 100);
  return NextResponse.json(data ?? careerOneStopUnavailable('apprenticeships', location));
}
