import { NextResponse, type NextRequest } from 'next/server';
import { filterJobsForUser, getJobPool } from '../../../../lib/server-data';
import { resolveUserId } from '../../../../lib/auth-server';

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
  const explicitBool = (k: string) => {
    const value = sp.get(k);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  };
  const str = (k: string) => {
    const v = sp.get(k);
    return v && v !== '' ? v : undefined;
  };

  const { jobs } = await getJobPool();
  const userId = resolveUserId(str('userId'));
  const data = await filterJobsForUser({
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
    includeRemote: explicitBool('includeRemote'),
    remote: bool('remote'),
    apprenticeshipsOnly: bool('apprenticeshipsOnly'),
    limit: num('limit'),
    offset: num('offset'),
  }, jobs, userId);
  return NextResponse.json(data);
}
