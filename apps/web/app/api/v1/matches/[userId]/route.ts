import { NextResponse, type NextRequest } from 'next/server';
import { matchesFor, getJobPool } from '../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20') || 20;
  const { jobs } = await getJobPool();
  return NextResponse.json(matchesFor(params.userId, limit, jobs));
}
