import { NextResponse } from 'next/server';
import { jobsStats, getJobPool } from '../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { jobs } = await getJobPool();
  return NextResponse.json(jobsStats(jobs));
}
