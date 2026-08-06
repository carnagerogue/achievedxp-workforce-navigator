import { NextResponse } from 'next/server';
import { findJob, getJobPool } from '../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { jobs } = await getJobPool();
  const job = findJob(params.id, jobs);
  if (!job) return NextResponse.json({ message: 'Job not found' }, { status: 404 });
  return NextResponse.json(job);
}
