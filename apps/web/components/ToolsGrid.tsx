'use client';

import Link from 'next/link';
import { Briefcase, HardHat, GraduationCap, Rocket, HandCoins, LifeBuoy, MapPin, Brain, FileText, Link2 } from 'lucide-react';

const TOOLS: { href: string; label: string; sub: string; Icon: typeof Briefcase }[] = [
  { href: '/jobs', label: 'Find a job', sub: 'Personalized matches', Icon: Briefcase },
  { href: '/apply-kit', label: 'Apply Kit', sub: 'Fill it once, reuse everywhere', Icon: FileText },
  { href: '/connections', label: 'Connections', sub: 'Link your job accounts', Icon: Link2 },
  { href: '/apprenticeships', label: 'Apprenticeships', sub: 'Earn while you learn', Icon: HardHat },
  { href: '/assessment', label: 'Career quiz', sub: 'What fits you (5 min)', Icon: Brain },
  { href: '/learn', label: 'Learn new skills', sub: 'Free & low-cost', Icon: GraduationCap },
  { href: '/entrepreneurship', label: 'Be your own boss', sub: 'Start a business', Icon: Rocket },
  { href: '/benefits', label: 'Benefits checkup', sub: 'What you qualify for', Icon: HandCoins },
  { href: '/resources', label: 'Free help & hotlines', sub: 'Food, health, housing…', Icon: LifeBuoy },
  { href: '/local-help', label: 'Local help', sub: 'Job centers near you', Icon: MapPin },
];

/** "Explore your tools" launcher grid — the home page's complete tool inventory. */
export function ToolsGrid() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-bold text-navy-900">Explore your tools</h2>
      <p className="mt-0.5 text-sm text-slate-600">Everything here is free. Jump to any of it any time.</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="group flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-sm">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-100"><t.Icon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy-900">{t.label}</span>
              <span className="block text-[11px] text-slate-500">{t.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
