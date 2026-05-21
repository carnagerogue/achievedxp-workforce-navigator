import { NextResponse, type NextRequest } from 'next/server';
import { jobsByIds } from '../../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
  return NextResponse.json(jobsByIds(ids));
}
