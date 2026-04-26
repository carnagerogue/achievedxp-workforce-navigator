/**
 * User Context Mode — adjusts which next-step recommendations are
 * surfaced based on where the user currently is in the reentry arc.
 *
 * This is purely a recommendation-shaping signal; it does NOT change
 * the compatibility score itself. The point is to keep advice relevant
 * (e.g., don't tell someone who's currently incarcerated to "apply
 * today" — tell them to build credentials and identify post-release
 * targets).
 */

export type UserContextMode =
  | 'currently_incarcerated'
  | 'preparing_for_release'
  | 'recently_released'
  | 'in_the_community'
  | 'on_supervision';

export interface UserContextLabel {
  value: UserContextMode;
  label: string;
  description: string;
}

export const USER_CONTEXT_OPTIONS: UserContextLabel[] = [
  { value: 'currently_incarcerated', label: 'Currently incarcerated',  description: 'Building credentials and planning for release.' },
  { value: 'preparing_for_release',  label: 'Preparing for release',   description: 'Release within the next ~12 months. Lining up jobs and resources.' },
  { value: 'recently_released',      label: 'Recently released',       description: 'Released within the past 6 months. Need work soon.' },
  { value: 'in_the_community',       label: 'In the community',         description: 'No active supervision. Looking to advance or change roles.' },
  { value: 'on_supervision',         label: 'On supervision',          description: 'Active parole or probation. Compliance-friendly options first.' },
];

/**
 * Recommendation priorities per context. The Caseworker Mode and the
 * compatibility-drawer chance-improvers consume this list to decide
 * which suggestions to surface first.
 */
export interface ContextPriorities {
  /** Top categories to push to the front of recommendation lists. */
  prioritize: string[];
  /** Categories to deprioritize or hide. */
  deprioritize: string[];
  /** One-sentence guidance shown next to recommendation lists. */
  guidance: string;
}

const PRIORITIES: Record<UserContextMode, ContextPriorities> = {
  currently_incarcerated: {
    prioritize: ['career_exploration', 'training', 'certification', 'resume_prep', 'reentry_plan', 'post_release_targets', 'workforce_resources'],
    deprioritize: ['apply_now', 'driving_required', 'in_person_interview'],
    guidance: 'Focus on credentials and reentry planning. Use the recommendations to identify roles to target after release.',
  },
  preparing_for_release: {
    prioritize: ['release_area_jobs', 'pre_release_training', 'documents', 'resume_prep', 'interview_prep', 'workforce_contacts'],
    deprioritize: ['apply_now'],
    guidance: 'Line up training that finishes before release and identify employers in the release area.',
  },
  recently_released: {
    prioritize: ['immediate_employment', 'low_barrier', 'transportation_realistic', 'local_resources', 'strong_match', 'caseworker_support'],
    deprioritize: ['long_training_program', 'relocation'],
    guidance: 'Prioritize fast, accessible employment. Build stability first; long pathways can come after.',
  },
  in_the_community: {
    prioritize: ['best_live_jobs', 'career_advancement', 'training_bridge', 'employer_fit', 'wage_growth'],
    deprioritize: [],
    guidance: 'Optimize for the highest-quality match and longer-term advancement.',
  },
  on_supervision: {
    prioritize: ['stable_schedule', 'transportation_realistic', 'compliance_friendly', 'avoid_unrealistic_barriers', 'local_resources'],
    deprioritize: ['out_of_area', 'travel_required', 'irregular_hours'],
    guidance: 'Choose roles that fit supervision conditions. Verify any travel, hours, or industry restrictions with your supervising officer.',
  },
};

export function priorititiesFor(mode: UserContextMode): ContextPriorities {
  return PRIORITIES[mode];
}
