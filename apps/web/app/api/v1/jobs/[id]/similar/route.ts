import { NextResponse, type NextRequest } from 'next/server';
import { similarJobs } from '../../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '4') || 4;
  return NextResponse.json(similarJobs(params.id, limit));
}
