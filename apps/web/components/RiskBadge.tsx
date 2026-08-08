import type { RiskTier } from '@dxp/shared';

const palette: Record<RiskTier, string> = {
  LOW:    'bg-teal-50   text-teal-700    border-teal-200',
  MEDIUM: 'bg-amber-50  text-amber-800   border-amber-200',
  HIGH:   'bg-rose-50   text-rose-700    border-rose-200',
};

const label: Record<RiskTier, string> = {
  LOW:    'Lower review likelihood',
  MEDIUM: 'Standard scrutiny',
  HIGH:   'High scrutiny',
};

// Plain-language explanation surfaced on hover/focus for a low-jargon read.
const explain: Record<RiskTier, string> = {
  LOW:    'The role type has fewer common screening barriers. The employer’s fair-chance policy is still unknown unless explicitly stated.',
  MEDIUM: 'The posting has mixed or incomplete screening signals. Confirm the employer’s policy.',
  HIGH:   'This role has stronger screening signals. Review the evidence before applying.',
};

export function RiskBadge({ tier, backgroundCheckLikely }: { tier: RiskTier; backgroundCheckLikely?: boolean }) {
  const suffix = backgroundCheckLikely ? ' · Background check likely' : '';
  const title = explain[tier] + (backgroundCheckLikely ? ' This employer likely runs a background check.' : '');
  return (
    <span title={title} className={`inline-flex max-w-full flex-wrap items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${palette[tier]}`}>
      {label[tier]}
      {suffix}
    </span>
  );
}
