/**
 * Public entry point for the compatibility engine.
 *
 *   import { scoreJobCompatibility, CONVICTION_LABELS } from '@dxp/shared/compatibility';
 *
 * The engine is pure / deterministic and runs in both the API and the
 * browser. It does NOT replace the existing personalization scorer at
 * apps/api/src/scoring; it answers a different question.
 */

export * from './types';
export * from './industry-sensitivity';
export * from './signals';
export * from './risk-matrix';
export * from './explanations';
export * from './offense-hard-filters';
export { scoreJobCompatibility } from './scoring';

// New modules added in the caseworker-grade upgrade.
export * from './training-bridge';
export * from './background-explanation';
export * from './user-context';
export * from './employer-fair-chance';
export * from './career-action-plan';
