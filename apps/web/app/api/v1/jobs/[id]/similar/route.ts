import { NextResponse, type NextRequest } from 'next/server';
import { similarJobs, getJobPool } from '../../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '4') || 4;
  const { jobs } = await getJobPool();
  return NextResponse.json(similarJobs(params.id, limit, jobs));
}
