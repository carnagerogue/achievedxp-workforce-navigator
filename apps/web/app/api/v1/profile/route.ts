import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // The web client only reads success/failure here — round-trip the body
  // so the demo dashboard reflects what the user just submitted.
  return NextResponse.json({ ok: true, profile: body });
}
