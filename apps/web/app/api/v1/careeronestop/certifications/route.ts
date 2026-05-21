import { NextResponse, type NextRequest } from 'next/server';
import { mockCertifications } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const kw = req.nextUrl.searchParams.get('keyword') ?? '';
  return NextResponse.json(mockCertifications(kw));
}
