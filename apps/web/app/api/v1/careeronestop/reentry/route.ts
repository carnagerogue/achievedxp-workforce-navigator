import { NextResponse, type NextRequest } from 'next/server';
import { mockReentryPrograms } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get('location') ?? '';
  return NextResponse.json(mockReentryPrograms(location));
}
