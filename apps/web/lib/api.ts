import type {
  JobDto,
  PaginatedJobsDto,
  MatchesResponseDto,
  ConvictionDto,
  InsightsResponseDto,
  JobsStatsDto,
} from '@dxp/shared';

// Defaults to the in-app mock layer at /api/v1 so the deployed web service
// is self-sufficient. Point at a real NestJS backend by setting
// NEXT_PUBLIC_API_URL (e.g. https://api.example.com/api/v1) at build time.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// --- Users ---

export interface CreatedUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export const createUser = (body: { email: string; displayName?: string }) =>
  request<CreatedUser>('/users', { method: 'POST', body: JSON.stringify(body) });

// --- Profile ---

export interface ProfileInput {
  userId: string;
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
  meta?: { configured: boolean; finderUrl: string; message: string };
}
export interface CosErrorRow { Error: string; Description?: string }

export const getAjcCenters = (location: string, radius = 50) =>
  request<AjcCentersResponse>(`/careeronestop/centers?location=${encodeURIComponent(location)}&radius=${radius}`);

export const getReentryPrograms = (location: string, radius = 100) =>
  request<unknown>(`/careeronestop/reentry?location=${encodeURIComponent(location)}&radius=${radius}`);

// --- Community resources (real local where a free gov API exists, else curated) ---
export interface CommunityLiveResource {
  id: string;
  name: string;
  desc?: string;
  address?: string;
  cityState?: string;
  phone?: string;
  url?: string;
  distance?: string;
}
export interface CommunityResponse {
  category: string;
  source: string | null;
  local: CommunityLiveResource[];
  national: CommunityLiveResource[];
}
export const getCommunityResources = (category: string, location: string) =>
  request<CommunityResponse>(`/community?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}`);

// --- SAMHSA treatment locator (live, no API key) ---
export interface TreatmentResponse {
  source: string | null;
  results: CommunityLiveResource[];
}
export const getTreatmentCenters = (location: string) =>
  request<TreatmentResponse>(`/treatment?location=${encodeURIComponent(location)}`);

export const getCosWages = (onetCodeOrKeyword: string, location?: string) => {
  const q = `onet=${encodeURIComponent(onetCodeOrKeyword)}${location ? `&location=${encodeURIComponent(location)}` : ''}`;
  return request<unknown>(`/careeronestop/wages?${q}`);
};

export const getCosLicenses = (keyword: string, location: string) =>
  request<unknown>(`/careeronestop/licenses?onet=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`);

export const getCosCertifications = (keyword: string) =>
  request<unknown>(`/careeronestop/certifications?keyword=${encodeURIComponent(keyword)}`);

export const getCosApprenticeships = (keyword: string, location: string, radius = 50) =>
  request<unknown>(`/careeronestop/apprenticeships?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&radius=${radius}`);
