import { NextResponse, type NextRequest } from 'next/server';
import { mockApprenticeships } from '../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(mockApprenticeships(sp.get('onet') ?? '', sp.get('location') ?? ''));
}
