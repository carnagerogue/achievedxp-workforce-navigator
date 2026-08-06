import { NextResponse } from 'next/server';
import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_SCALE,
} from '../../../../../lib/server-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    questions: ASSESSMENT_QUESTIONS,
    dimensions: ASSESSMENT_DIMENSIONS,
    scale: ASSESSMENT_SCALE,
  });
}
