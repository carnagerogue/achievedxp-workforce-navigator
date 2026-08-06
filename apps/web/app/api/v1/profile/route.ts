import { NextResponse, type NextRequest } from 'next/server';
import { PROFILE_COLLECTION, type StoredProfile } from '../../../../lib/profile-store';
import { putDoc } from '../../../../lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<StoredProfile>;

  if (!body || typeof body.userId !== 'string' || body.userId === '') {
    return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 });
  }

  // Persist so /matches and /insights can read the real profile and run
  // conviction-aware scoring: putDoc writes the in-process memory store
  // synchronously and, when DATABASE_URL is configured, upserts Postgres so
  // the profile survives redeploys. (No-op against a real backend, which is
  // selected via NEXT_PUBLIC_API_URL.)
  const profile = body as StoredProfile;
  await putDoc(PROFILE_COLLECTION, profile.userId, profile);

  return NextResponse.json({ ok: true, profile });
}
