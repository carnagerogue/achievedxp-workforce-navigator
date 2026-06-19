import { NextResponse } from 'next/server';
import { getJobPool } from '../../../../../lib/mock-data';
import { auditPool } from '@dxp/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Data-quality QA report: surfaces job records with suspicious classifications
 * (apprenticeship on senior role, fair-chance/exclusion conflict, uncertain
 * industry, sparse posting, malformed location) for human review.
 */
export async function GET() {
  const { jobs, isMock } = await getJobPool();
  const report = auditPool(jobs);
  return NextResponse.json({ ...report, isMock });
}
