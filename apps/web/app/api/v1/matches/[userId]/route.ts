import { NextResponse, type NextRequest } from 'next/server';
import { matchesFor } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20') || 20;
  return NextResponse.json(matchesFor(params.userId, limit));
}
