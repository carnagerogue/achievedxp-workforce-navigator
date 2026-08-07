import { NextResponse } from 'next/server';
import { insightsFor, getJobPool } from '../../../../../../lib/server-data';
import { resolveUserId } from '../../../../../../lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const userId = resolveUserId(params.userId);
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { jobs } = await getJobPool();
  return NextResponse.json(await insightsFor(userId, jobs));
}
