import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as { email?: string; displayName?: string }));
  const email = typeof body?.email === 'string' ? body.email : 'demo@example.com';
  const displayName = typeof body?.displayName === 'string' ? body.displayName : null;
  // Deterministic id derived from email so the mock dashboard stays stable.
  const id = 'u_' + Buffer.from(email).toString('hex').slice(0, 24);
  return NextResponse.json({
    id,
    email,
    displayName,
    createdAt: new Date().toISOString(),
  });
}
