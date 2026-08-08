'use client';

import { lsGet, lsSet } from './scoped-storage';

const KEY = 'job-search-preferences:v1';

export interface JobSearchPreferences {
  includeRemoteJobs: boolean;
}

const DEFAULTS: JobSearchPreferences = {
  includeRemoteJobs: true,
};

export function getJobSearchPreferences(): JobSearchPreferences {
  const raw = lsGet(KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<JobSearchPreferences>;
    return {
      includeRemoteJobs: parsed.includeRemoteJobs !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setIncludeRemoteJobs(includeRemoteJobs: boolean): void {
  lsSet(KEY, JSON.stringify({ includeRemoteJobs } satisfies JobSearchPreferences));
}
