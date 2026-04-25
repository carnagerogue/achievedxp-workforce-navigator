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

export function RiskBadge({ tier, backgroundCheckLikely }: { tier: RiskTier; backgroundCheckLikely?: boolean }) {
  const suffix = backgroundCheckLikely ? ' · BG check likely' : '';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${palette[tier]}`}>
      {label[tier]}
      {suffix}
    </span>
  );
}
