import { NextResponse, type NextRequest } from 'next/server';
import { careerOneStopUnavailable, occupationalCertifications } from '../../../../../lib/careeronestop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const kw = req.nextUrl.searchParams.get('keyword') ?? '';
  const data = await occupationalCertifications(kw);
  return NextResponse.json(data ?? careerOneStopUnavailable('certifications', kw));
}
