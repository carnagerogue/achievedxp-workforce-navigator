/**
 * Context-aware narrative plan builder — the 30/60/90 (or pre-release) phase
 * outline shown in the workspace and printed on the case document. Extracted
 * from the original single-page caseworker view so both surfaces share it.
 */
import type { UserContextMode, TrainingBridgeStep } from '@dxp/shared';
import type { Participant } from './caseworker-store';

export interface Phase { title: string; items: string[] }

export function planTitle(mode: UserContextMode): string {
  return mode === 'currently_incarcerated' || mode === 'preparing_for_release'
    ? 'Pre-release action plan'
    : '30 / 60 / 90-day plan';
}

export function buildPlan(
  p: Participant,
  topCount: number,
  steps: TrainingBridgeStep[],
  resourceCount: number,
): Phase[] {
  const cred = steps[0]?.title;
  const goal = p.careerGoal ? `toward "${p.careerGoal}"` : '';
  const resourceLine = resourceCount > 0
    ? 'Connect with the flagged local resources (housing, transport, recovery, legal).'
    : null;

  if (p.contextMode === 'currently_incarcerated' || p.contextMode === 'preparing_for_release') {
    return [
      { title: 'Now (pre-release)', items: [
        cred ? `Start ${cred} or an available in-facility credential ${goal}`.trim() : `Identify in-facility training ${goal}`.trim(),
        'Gather/replace ID documents (state ID, Social Security card, birth certificate).',
        'Build a basic résumé from work assignments and any certifications.',
      ] },
      { title: 'Release area', items: [
        topCount > 0 ? `Target the ${topCount} realistic roles identified here in the release area.` : 'Set a target ZIP and re-run matches for the release area.',
        'Line up a first appointment at the local American Job Center for week one.',
        resourceLine ?? 'Identify reentry housing/transport before release.',
      ] },
      { title: 'First 30 days out', items: [
        'Apply to the strongest matches; bring ID + résumé to walk-ins.',
        'Check in with caseworker weekly; record progress on the plan.',
      ] },
    ];
  }

  const compliance = p.contextMode === 'on_supervision'
    ? 'Confirm hours, travel, and industry restrictions with the supervising officer.'
    : null;
  return [
    { title: '30 days', items: [
      topCount > 0 ? `Apply to the ${Math.min(5, topCount)} strongest matches ${goal}`.trim() : 'Broaden the search ZIP and re-run matches.',
      cred ? `Enroll in / schedule ${cred}.` : 'Refresh résumé with current skills and certifications.',
      compliance,
      resourceLine,
    ].filter(Boolean) as string[] },
    { title: '60 days', items: [
      'Apply to additional "worth a look" roles; attend one hiring event or job-center orientation.',
      cred ? `Complete ${cred} and add it to the résumé.` : 'Add one stackable credential aligned to the goal.',
    ] },
    { title: '90 days', items: [
      'Target apprenticeships or higher-wage roles unlocked by new credentials.',
      'Review progress with caseworker and reset the next 90-day goal.',
    ] },
  ];
}
