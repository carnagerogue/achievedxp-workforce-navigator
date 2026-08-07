import { NextResponse, type NextRequest } from 'next/server';
import { careerOneStopUnavailable, occupationWages } from '../../../../../lib/careeronestop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const onet = req.nextUrl.searchParams.get('onet') ?? '';
  const location = req.nextUrl.searchParams.get('location') ?? 'US';
  const data = await occupationWages(onet, location);
  return NextResponse.json(data ?? careerOneStopUnavailable('wages', `${onet} · ${location}`));
}
