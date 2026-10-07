'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Phone, Scale, Shield, Waypoints } from 'lucide-react';
import { SECTIONS, CASEWORKER_HREF } from '../lib/navigation';

/**
 * Two footers. Inside the app it is one quiet line — crisis help, privacy and
 * the staff entrance — so it never competes with the work on the page. Only
 * the public landing page carries the full brand footer.
 */
export function SiteFooter() {
  const pathname = usePathname() ?? '/';
  return pathname === '/' ? <BrandFooter /> : <AppFooter />;
}

function AppFooter() {
  return (
    <footer className="border-t border-slate-900/[0.08] bg-white/70">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-sunset-600" aria-hidden="true" />
          <span>In crisis? <a href="tel:988" className="font-semibold text-navy-900 underline-offset-2 hover:underline">Call or text 988</a> any time, free.</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Your details stay private until you choose to share.</span>
          <Link href={CASEWORKER_HREF} className="font-medium text-slate-600 hover:text-navy-900">For caseworkers</Link>
          <span>© {new Date().getFullYear()} Achieve DXP</span>
        </p>
      </div>
    </footer>
  );
}

function BrandFooter() {
  return (
    <footer className="border-t border-white/15 bg-navy-900 text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <div className="grid gap-10 border-b border-white/15 pb-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="section-kicker text-sunset-300">Achieve DXP</p>
            <p className="mt-4 max-w-sm font-display text-4xl font-black uppercase leading-[.9]">A clearer route forward.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Promise Icon={Shield} title="Private by default">Your personal details stay in your workspace until you choose to share.</Promise>
            <Promise Icon={Scale} title="Evidence, not mystery">Every fit signal can be inspected.</Promise>
            <Promise Icon={Waypoints} title="One useful action">The full path stays visible.</Promise>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 py-9 text-xs text-teal-100 sm:grid-cols-6" aria-label="Footer navigation">
          {SECTIONS.map(({ key, href, label }) => (
            <Link key={key} href={href} className="inline-flex items-center gap-1 hover:text-sunset-300">{label}<ArrowUpRight className="h-3 w-3" /></Link>
          ))}
          <Link href={CASEWORKER_HREF} className="inline-flex items-center gap-1 hover:text-sunset-300">For caseworkers<ArrowUpRight className="h-3 w-3" /></Link>
        </nav>
        <div className="flex flex-wrap justify-between gap-2 border-t border-white/15 pt-5 text-[11px] text-navy-300">
          <span>© {new Date().getFullYear()} Achieve DXP · Workforce Navigator</span>
          <span>Guidance, not an employer decision.</span>
        </div>
      </div>
    </footer>
  );
}

function Promise({ Icon, title, children }: { Icon: typeof Shield; title: string; children: React.ReactNode }) {
  return <div className="border-t border-white/15 pt-4"><Icon className="h-5 w-5 text-sunset-300" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-teal-200">{children}</p></div>;
}
