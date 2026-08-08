export type DashboardState = 'loading' | 'onboarding' | 'ready';

/**
 * Personalized dashboard content is earned by completed onboarding data. An
 * authenticated account alone never implies health, supervision, career, or
 * progress information about the person.
 */
export function dashboardState(
  scopeReady: boolean,
  profileHydrated: boolean,
  onboardingComplete: boolean,
): DashboardState {
  if (!scopeReady || !profileHydrated) return 'loading';
  return onboardingComplete ? 'ready' : 'onboarding';
}
