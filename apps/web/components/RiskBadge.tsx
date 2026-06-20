import type { RiskTier } from '@dxp/shared';

const palette: Record<RiskTier, string> = {
  LOW:    'bg-teal-50   text-teal-700    border-teal-200',
  MEDIUM: 'bg-amber-50  text-amber-800   border-amber-200',
  HIGH:   'bg-rose-50   text-rose-700    border-rose-200',
};

const label: Record<RiskTier, string> = {
  LOW:    'Second-chance friendly',
  MEDIUM: 'Standard scrutiny',
  HIGH:   'High scrutiny',
};

// Plain-language explanation surfaced on hover/focus for a low-jargon read.
const explain: Record<RiskTier, string> = {
  LOW:    'This kind of employer often hires people with a record.',
  MEDIUM: 'A normal hiring process — your record may come up, but it’s usually not an automatic no.',
  HIGH:   'This employer looks closely at background — expect more questions about your record.',
};

export function RiskBadge({ tier, backgroundCheckLikely }: { tier: RiskTier; backgroundCheckLikely?: boolean }) {
  const suffix = backgroundCheckLikely ? ' · Background check likely' : '';
  const title = explain[tier] + (backgroundCheckLikely ? ' This employer likely runs a background check.' : '');
  return (
    <span title={title} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${palette[tier]}`}>
      {label[tier]}
      {suffix}
    </span>
  );
}
