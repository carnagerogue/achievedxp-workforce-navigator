import { NextResponse } from 'next/server';
import { jobsStats, getJobPool } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { jobs } = await getJobPool();
  return NextResponse.json(jobsStats(jobs));
}
