import { NextResponse, type NextRequest } from 'next/server';
import { getAssessmentResultFor, scoreAssessment } from '../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  return NextResponse.json(getAssessmentResultFor(params.userId));
}

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const body = await req.json().catch(() => ({}));
  const answers: Record<number, number> = {};
  if (body && typeof body.answers === 'object' && body.answers) {
    for (const [k, v] of Object.entries(body.answers as Record<string, unknown>)) {
      const id = Number(k);
      const val = Number(v);
      if (Number.isFinite(id) && Number.isFinite(val)) answers[id] = val;
    }
  }
  return NextResponse.json(scoreAssessment(params.userId, answers));
}
