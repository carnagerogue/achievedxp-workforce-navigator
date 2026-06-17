import { NextResponse, type NextRequest } from 'next/server';
import { saveProfile, type StoredProfile } from '../../../../lib/profile-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<StoredProfile>;

  if (!body || typeof body.userId !== 'string' || body.userId === '') {
    return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 });
  }

  // Persist into the in-process store so /matches and /insights can read the
  // real profile and run conviction-aware scoring. (No-op against a real
  // backend, which is selected via NEXT_PUBLIC_API_URL.)
  const profile = saveProfile(body as StoredProfile);

  return NextResponse.json({ ok: true, profile });
}
