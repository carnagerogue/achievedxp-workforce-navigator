import { NextResponse } from 'next/server';
import { jobsStats } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(jobsStats());
}
