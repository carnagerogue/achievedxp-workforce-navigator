import { NextResponse, type NextRequest } from 'next/server';
import { mockLicenses } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(mockLicenses(sp.get('onet') ?? '', sp.get('location') ?? ''));
}
