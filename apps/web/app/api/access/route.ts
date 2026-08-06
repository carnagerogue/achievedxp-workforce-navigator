import { NextResponse, type NextRequest } from 'next/server';

/**
 * Password-gate validation endpoint.
 *
 * Accepts POST { password: string }. If it matches SITE_PASSWORD, sets the
 * `dxp_gate` cookie to the SHA-256 hex of the password and returns 200. The
 * middleware re-derives the same hash on every request to authorize.
 *
 * There is deliberately NO fallback password: this repository is public, so
 * any default committed here is equivalent to no gate at all. If
 * SITE_PASSWORD is unset the endpoint fails closed with 503 — set the env
 * var on the deployment (or SITE_GATE=off to disable the gate entirely).
 *
 * Cookie is HttpOnly (no JS access), Secure (HTTPS-only), SameSite=Lax
 * (allows top-level GET nav including the post-success redirect),
 * Path=/ so it applies to the entire site, and 7-day expiry.
 *
 * Constant-time string compare prevents trivial timing attacks against
 * the password — though for a pre-launch gate the realistic threat
 * model is "guessable password", not "remote timing oracle".
 */

export const runtime = 'edge';

const COOKIE = 'dxp_gate';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(req: NextRequest) {
  let body: { password?: unknown } = {};
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const provided = typeof body.password === 'string' ? body.password : '';
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: 'Access is not configured. The site operator must set SITE_PASSWORD.' },
      { status: 503 },
    );
  }

  if (!constantTimeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const hash = await sha256Hex(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: hash,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

/** Revoke the gate cookie — useful for a future "Sign out" affordance. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
