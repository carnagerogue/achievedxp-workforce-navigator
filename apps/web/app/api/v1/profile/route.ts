import { NextResponse, type NextRequest } from 'next/server';
import { PROFILE_COLLECTION, type StoredProfile } from '../../../../lib/profile-store';
import { putDoc } from '../../../../lib/storage';
import { resolveUserId } from '../../../../lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<StoredProfile>;

  // With accounts on, the profile is always stored under the verified session
  // id — a client can't write into someone else's profile by sending their id.
  const userId = resolveUserId(typeof body.userId === 'string' ? body.userId : null);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 });
  }

  // Persist so /matches and /insights can read the real profile and run
  // conviction-aware scoring: putDoc writes the in-process memory store
  // synchronously and, when DATABASE_URL is configured, upserts Postgres so
  // the profile survives redeploys. (No-op against a real backend, which is
  // selected via NEXT_PUBLIC_API_URL.)
  const profile = { ...body, userId } as StoredProfile;
  await putDoc(PROFILE_COLLECTION, userId, profile);

  return NextResponse.json({ ok: true, profile });
}
