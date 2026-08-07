import { NextResponse, type NextRequest } from 'next/server';
import { careerOneStopUnavailable, occupationalLicenses } from '../../../../../lib/careeronestop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const keyword = sp.get('onet') ?? '';
  const location = sp.get('location') ?? 'US';
  const data = await occupationalLicenses(keyword, location);
  return NextResponse.json(data ?? careerOneStopUnavailable('licenses', `${keyword} · ${location}`));
}
