import { NextResponse } from 'next/server';
import { insightsFor, getJobPool } from '../../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { jobs } = await getJobPool();
  return NextResponse.json(insightsFor(params.userId, jobs));
}
