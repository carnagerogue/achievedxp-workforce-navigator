import { NextResponse, type NextRequest } from 'next/server';
import { filterJobs, getJobPool } from '../../../../lib/mock-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const bool = (k: string) => sp.get(k) === 'true' ? true : undefined;
  const str = (k: string) => {
    const v = sp.get(k);
    return v && v !== '' ? v : undefined;
  };

  const { jobs } = await getJobPool();
  const data = filterJobs({
    q: str('q'),
    industry: str('industry'),
    city: str('city'),
    region: str('region'),
    postalCode: str('postalCode'),
    radiusMiles: num('radiusMiles'),
    offenseType: str('offenseType'),
    hideFelonExclusions: bool('hideFelonExclusions'),
    minSalary: num('minSalary'),
    postedWithinDays: num('postedWithinDays'),
    remote: bool('remote'),
    apprenticeshipsOnly: bool('apprenticeshipsOnly'),
    limit: num('limit'),
    offset: num('offset'),
  }, jobs);
  return NextResponse.json(data);
}
