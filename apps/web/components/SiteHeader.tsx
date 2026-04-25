'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, UserCircle2, Command, BarChart3, HardHat, HeartHandshake } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard',       label: 'Dashboard',       Icon: LayoutDashboard },
  { href: '/jobs',            label: 'Browse jobs',     Icon: Search },
  { href: '/apprenticeships', label: 'Apprenticeships', Icon: HardHat },
  { href: '/local-help',      label: 'Local help',      Icon: HeartHandshake },
  { href: '/insights',        label: 'Insights',        Icon: BarChart3 },
  { href: '/onboarding',      label: 'Profile',         Icon: UserCircle2 },
];

/**
 * Responsive nav. Three breakpoints chosen so labels never wrap:
 *
 *   < md  : logo, icon-only nav, no Search button. Pages still reachable
 *           via icons; ⌘K / "/" still opens the palette globally.
 *   md+   : Search button shows; nav stays icon-only.
 *   xl+   : nav labels appear ("Dashboard", "Browse jobs", …) and the
 *           "· Workforce Navigator" tagline next to the logo.
 *
 * Below xl the wordmark tagline used to wrap into the search button — that's
 * the visual collision being fixed here. Hiding it below xl keeps the
 * header to a single clean line at every viewport width.
 */
export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const [modMeta, setModMeta] = useState(false);
  useEffect(() => {
    setModMeta(typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const openPalette = () => {
    const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
    window.dispatchEvent(ev);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
        {/* Logo + tagline */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-md"
          aria-label="Achieve DXP home"
        >
          <Image
            src="/logo.png"
            alt="Achieve DXP"
            width={170}
            height={40}
            priority
            className="h-8 w-auto"
          />
          <span className="hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 xl:inline">
            · Workforce Navigator
          </span>
        </Link>

        {/* Spacer pushes the rest to the right */}
        <div className="flex-1" />

        {/* Search button (palette trigger) */}
        <button
          type="button"
          onClick={openPalette}
          className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 md:inline-flex"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <span className="ml-2 flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-500">
            {modMeta ? <Command className="h-2.5 w-2.5" /> : 'Ctrl'}
            <span>K</span>
          </span>
        </button>

        {/* Nav */}
        <nav className="flex shrink-0 items-center gap-0.5 text-sm">
          {NAV.map(({ href, label, Icon }) => {
            const active =
              href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium transition ' +
                  (active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                }
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
