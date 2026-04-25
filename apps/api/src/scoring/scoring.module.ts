import { Module } from '@nestjs/common';
import { SCORER } from './scorer.types';
import { RuleScorer } from './rule.scorer';

@Module({
  providers: [
    RuleScorer,
    // Bind the `Scorer` interface via DI token. Phase 5 swaps in a hybrid
    // scorer (rule + NLP signals) by changing only this `useExisting`.
    { provide: SCORER, useExisting: RuleScorer },
  ],
  exports: [SCORER],
})
export class ScoringModule {}
