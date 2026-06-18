import { NextResponse, type NextRequest } from 'next/server';
import { geocodeLocation } from '../../../../lib/careeronestop';
import { findTreatmentCenters, type LiveResource } from '../../../../lib/treatment';
import { COMMUNITY_RESOURCES } from '../../../../lib/community-resources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const category = (req.nextUrl.searchParams.get('category') ?? '').trim();
  const location = (req.nextUrl.searchParams.get('location') ?? '').trim();

  // Curated, vetted national programs — always available, no leaving the site
  // to discover them.
  const national: LiveResource[] = (COMMUNITY_RESOURCES[category] ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    desc: r.desc,
    phone: r.phone,
    url: r.url,
  }));

  // Real local results from free government APIs where one exists for this
  // category. Today: SAMHSA (behavioral health / recovery). Others fall back
  // to the curated national list.
  let local: LiveResource[] = [];
  let source: string | null = null;
  if (category === 'health' && location) {
    const { lat, lng } = await geocodeLocation(location);
    if (lat != null && lng != null) {
      local = await findTreatmentCenters(lat, lng, 8);
      if (local.length > 0) source = 'SAMHSA — findtreatment.gov';
    }
  }

  return NextResponse.json({ category, source, local, national });
}
