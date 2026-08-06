import { NextResponse } from 'next/server';
import { insightsFor, getJobPool } from '../../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const { jobs } = await getJobPool();
  return NextResponse.json(await insightsFor(params.userId, jobs));
}
