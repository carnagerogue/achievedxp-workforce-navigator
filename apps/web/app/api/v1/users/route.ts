import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as { email?: string; displayName?: string }));
  const email = typeof body?.email === 'string' ? body.email : 'demo@example.com';
  const displayName = typeof body?.displayName === 'string' ? body.displayName : null;
  // Guest identifiers must be unguessable. Deriving this from an email let
  // anyone who knew that email address reconstruct another guest's API key.
  const id = `u_${randomUUID()}`;
  return NextResponse.json({
    id,
    email,
    displayName,
    createdAt: new Date().toISOString(),
  });
}
