'use client';

import Link from 'next/link';
import { Phone, ArrowRight } from 'lucide-react';
import type { JourneyAction } from '../../lib/reentry-journey';

/** Phase accent gradients — shared by the roadmap and the next-step card. */
export const PHASE_ACCENT: Record<string, string> = {
  stabilize: 'from-rose-500 to-orange-500',
  connect: 'from-violet-500 to-fuchsia-500',
  earn: 'from-teal-500 to-cyan-500',
  grow: 'from-emerald-500 to-teal-600',
};

/** A journey step's action — a page link, a phone call, or a spot on My plan. */
export function ActionButton({ action, primary, className }: { action: JourneyAction; primary?: boolean; className?: string }) {
  const cls = className ?? (primary
    ? 'group inline-flex items-center gap-1.5 rounded-full bg-teal-600 py-2.5 pl-5 pr-4 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98]'
    : 'inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-600/40 hover:text-teal-700');
  const Icon = action.kind === 'tel' ? Phone : ArrowRight;
  const arrow = <Icon className={'h-4 w-4 shrink-0' + (primary ? ' transition-transform duration-200 group-hover:translate-x-0.5' : '')} aria-hidden="true" />;
  if (action.kind === 'route' || action.href.startsWith('/')) return <Link href={action.href} className={cls}>{action.label} {arrow}</Link>;
  if (action.kind === 'tel') return <a href={action.href} className={cls}>{arrow} {action.label}</a>;
  return <a href={action.href} className={cls}>{action.label} {arrow}</a>;
}
