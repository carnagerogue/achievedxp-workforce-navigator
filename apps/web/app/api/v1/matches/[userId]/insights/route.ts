import { NextResponse } from 'next/server';
import { insightsFor } from '../../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { userId: string } }) {
  return NextResponse.json(insightsFor(params.userId));
}
