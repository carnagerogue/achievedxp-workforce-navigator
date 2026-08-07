import { NextResponse, type NextRequest } from 'next/server';
import { matchesFor, getJobPool } from '../../../../../lib/server-data';
import { resolveUserId } from '../../../../../lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20') || 20;
  // With accounts on, the verified session id wins over the path param, so a
  // signed-in user can never fetch another user's matches by editing the URL.
  const userId = resolveUserId(params.userId);
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { jobs } = await getJobPool();
  return NextResponse.json(await matchesFor(userId, limit, jobs));
}
