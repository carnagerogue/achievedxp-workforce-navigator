import { NextResponse } from 'next/server';
import { findJob } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = findJob(params.id);
  if (!job) return NextResponse.json({ message: 'Job not found' }, { status: 404 });
  return NextResponse.json(job);
}
