import type {
  JobDto,
  PaginatedJobsDto,
  MatchesResponseDto,
  ConvictionDto,
  InsightsResponseDto,
  JobsStatsDto,
} from '@dxp/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
    // Send the HttpOnly session cookie on every request. The API issues
    // it via /auth/login, /auth/register, /auth/claim — the browser holds
    // it but JS cannot read it (immune to XSS theft). The API still needs
    // it to identify the user, hence credentials: 'include'.
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  // 204 No Content responses (e.g. logout) won't have a JSON body.
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export const register = (body: { email: string; password: string; displayName?: string }) =>
  request<AuthUser>('/auth/register', { method: 'POST', body: JSON.stringify(body) });

export const login = (body: { email: string; password: string }) =>
  request<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(body) });

/** Set a password for an account that was created during the pre-auth phase. */
export const claimAccount = (body: { email: string; password: string }) =>
  request<AuthUser>('/auth/claim', { method: 'POST', body: JSON.stringify(body) });

export const logout = () => request<{ ok: true }>('/auth/logout', { method: 'POST' });

/** Returns the current user, or null if not signed in. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await request<AuthUser>('/auth/me');
  } catch (err) {
    // The API returns 401 when the cookie is missing or expired — treat
    // that as "not logged in" rather than surfacing it to the caller.
    if (err instanceof Error && err.message.startsWith('API 401')) return null;
    throw err;
  }
}

// --- Profile ---

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  locationCity?: string;
  locationRegion?: string;
  locationPostalCode?: string;
  yearsExperience?: number;
  hasTransportation?: boolean;
  willingToRelocate?: boolean;
  hasFelonyRecord?: boolean;
  yearsSinceRelease?: number;
  onParoleOrProbation?: boolean;
  restrictedIndustries?: string[];
  skills?: string[];
  certifications?: string[];
  desiredIndustries?: string[];
  convictions?: ConvictionDto[];
}

export const upsertProfile = (body: ProfileInput) =>
  request<unknown>('/profile', { method: 'POST', body: JSON.stringify(body) });

// --- Jobs ---

export const listJobs = (
  qs: Record<string, string | number | boolean | undefined> = {},
) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const q = params.toString();
  return request<PaginatedJobsDto>(`/jobs${q ? `?${q}` : ''}`);
};

export const getJob = (id: string) => request<JobDto>(`/jobs/${id}`);

export const getJobsByIds = (ids: string[]) =>
  request<JobDto[]>(`/jobs/bulk`, { method: 'POST', body: JSON.stringify({ ids }) });

export const getSimilarJobs = (id: string, limit = 4) =>
  request<JobDto[]>(`/jobs/${id}/similar?limit=${limit}`);

export const getJobsStats = () => request<JobsStatsDto>(`/jobs/stats`);

// --- Matches ---

export const getMatches = (userId: string, limit = 20) =>
  request<MatchesResponseDto>(`/matches/${userId}?limit=${limit}`);

export const getInsights = (userId: string) =>
  request<InsightsResponseDto>(`/matches/${userId}/insights`);

// --- Assessment (O*NET-style RIASEC short form) ---

export interface AssessmentQuestionDto {
  id: number;
  prompt: string;
  dimension: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
}
export interface AssessmentQuestionsDto {
  questions: AssessmentQuestionDto[];
  dimensions: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', { name: string; blurb: string }>;
  scale: Array<{ value: number; label: string }>;
}
export interface OccupationMatchDto {
  onetCode: string;
  title: string;
  hollandCode: string;
  jobZone: number;
  description: string;
  preparation: string;
  typicalWage: string;
  industry: string | null;
  fairChanceFriendly: boolean;
  fitPercent: number;
  liveJobCount: number;
  jobsQuery: string;
}
export interface AssessmentResultDto {
  userId: string;
  scores: { R: number; I: number; A: number; S: number; E: number; C: number };
  hollandCode: string;
  topDimensions: Array<{ code: 'R' | 'I' | 'A' | 'S' | 'E' | 'C'; name: string; blurb: string; score: number }>;
  recommendedIndustries: string[];
  occupations: OccupationMatchDto[];
  completedAt: string;
}

export const getAssessmentQuestions = () =>
  request<AssessmentQuestionsDto>('/assessment/questions');

export const getAssessmentResult = (userId: string) =>
  request<AssessmentResultDto | null>(`/assessment/${userId}`);

export const submitAssessment = (userId: string, answers: Record<number, number>) =>
  request<AssessmentResultDto>(`/assessment/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });

// --- CareerOneStop (U.S. Department of Labor) ---

export interface AjcCenter {
  ID: string;
  Name: string;
  Address1: string;
  Address2?: string;
  City: string;
  StateAbbr: string;
  Zip: string;
  Phone: string;
  Distance: string;
  ProgramType: string;
  OpenHour?: string;
  CenterIsOpen?: string;
  GeneralEmail?: string;
  Latitude?: number;
  Longitude?: number;
  WebSiteUrl?: string;
}
export interface AjcCentersResponse {
  OneStopCenterList?: AjcCenter[];
  RecordCount?: number;
  AreaValidationErr?: string;
  error?: string;
  partial?: boolean;
}
export interface CosErrorRow { Error: string; Description?: string }

export const getAjcCenters = (location: string, radius = 50) =>
  request<AjcCentersResponse>(`/careeronestop/centers?location=${encodeURIComponent(location)}&radius=${radius}`);

export const getReentryPrograms = (location: string, radius = 100) =>
  request<unknown>(`/careeronestop/reentry?location=${encodeURIComponent(location)}&radius=${radius}`);

// ─── Wages (BLS percentiles via CareerOneStop) ─────────────────────
//
// Defensive types — CareerOneStop's response shape varies subtly across
// occupations (some return a single area list, others nest by state vs
// nation). Treat every field as optional and fall back gracefully.
export interface CosWageArea {
  AreaName?: string;
  RateType?: string; // "Annual" | "Hourly"
  Median?: string;
  Pct10?: string;
  Pct25?: string;
  Pct75?: string;
  Pct90?: string;
  Mean?: string;
}
export interface CosOccupationWage {
  OccupationTitle?: string;
  OnetTitle?: string;
  OnetCode?: string;
  Wages?: { BLSAreaWagesList?: CosWageArea[] };
}
export interface CosWagesResponse {
  RecordCount?: number;
  OccupationDetail?: CosOccupationWage[];
  error?: string;
  partial?: boolean;
}

export const getCosWages = (onetCodeOrKeyword: string, location?: string) => {
  const q = `onet=${encodeURIComponent(onetCodeOrKeyword)}${location ? `&location=${encodeURIComponent(location)}` : ''}`;
  return request<CosWagesResponse>(`/careeronestop/wages?${q}`);
};

// ─── Licenses ───────────────────────────────────────────────────────
//
// Critical for justice-impacted candidates: many state licenses have
// conviction-related disqualifiers that the listing employer never spells
// out. Wiring this in lets the candidate see — before they apply — what
// licensing board governs the role and what its renewal/fee requirements
// look like in their state.
export interface CosLicense {
  Title?: string;
  AgencyName?: string;
  AgencyUrl?: string;
  Description?: string;
  Fees?: string;
  RenewalRequirements?: string;
  InitialContinuingEducationRequirement?: string;
  OnetTitle?: string;
  ApplicableStates?: string;
}
export interface CosLicensesResponse {
  RecordCount?: number;
  LicenseList?: CosLicense[];
  error?: string;
  partial?: boolean;
}

export const getCosLicenses = (keyword: string, location: string) =>
  request<CosLicensesResponse>(
    `/careeronestop/licenses?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`,
  );

// ─── Training programs ──────────────────────────────────────────────
//
// Closes the loop on TrainingBridge: the engine names the credential
// the user needs (CDL, OSHA 10, NCCER Core); CareerOneStop names the
// schools and programs that issue it nearby.
export interface CosTrainingProgram {
  SchoolName?: string;
  ProgramName?: string;
  Address1?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Phone?: string;
  ProgramUrl?: string;
  Cost?: string;
  ProgramType?: string;
}
export interface CosTrainingResponse {
  RecordCount?: number;
  SchoolPrograms?: { SchoolProgramList?: CosTrainingProgram[] };
  error?: string;
  partial?: boolean;
}

export const getCosTraining = (keyword: string, location: string, radius = 50) =>
  request<CosTrainingResponse>(
    `/careeronestop/training?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&radius=${radius}`,
  );

export const getCosCertifications = (keyword: string) =>
  request<unknown>(`/careeronestop/certifications?keyword=${encodeURIComponent(keyword)}`);

// ─── State apprenticeship offices ───────────────────────────────────
//
// CareerOneStop's apprenticeshipfinder returns the state Office of
// Apprenticeship + Apprenticeship Training Representative (ATR) contacts
// for a location. These are the people who maintain the registered
// apprenticeship roster for the area — calling them is the highest-yield
// move for someone who can't find a slot via job boards.
//
// Field names vary across COS responses (Office vs OfficeName, etc.);
// the component accesses everything optionally.
export interface CosApprenticeshipOffice {
  Office?: string;
  OfficeName?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  State?: string;
  StateAbbr?: string;
  Zip?: string;
  Phone?: string;
  Email?: string;
  ContactEmail?: string;
  ContactName?: string;
  Website?: string;
  Url?: string;
}
export interface CosApprenticeshipsResponse {
  RecordCount?: number;
  ApprenticeshipOfficeList?: CosApprenticeshipOffice[];
  // Some COS payloads use a different envelope name — accept either.
  Apprenticeships?: CosApprenticeshipOffice[];
  error?: string;
  partial?: boolean;
}

export const getCosApprenticeshipOffices = (location: string, radius = 100) =>
  request<CosApprenticeshipsResponse>(
    `/careeronestop/apprenticeships?location=${encodeURIComponent(location)}&radius=${radius}`,
  );

/** @deprecated keyword arg is ignored by the upstream endpoint — use getCosApprenticeshipOffices. */
export const getCosApprenticeships = (_keyword: string, location: string, radius = 50) =>
  getCosApprenticeshipOffices(location, radius);
