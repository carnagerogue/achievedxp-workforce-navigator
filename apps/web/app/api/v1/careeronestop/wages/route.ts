import { NextResponse, type NextRequest } from 'next/server';
import { mockWages } from '../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const onet = req.nextUrl.searchParams.get('onet') ?? '';
  return NextResponse.json(mockWages(onet));
}
