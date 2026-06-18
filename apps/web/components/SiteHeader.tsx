'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, UserCircle2, Command, HardHat, HeartHandshake, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard',       label: 'Dashboard',       Icon: LayoutDashboard },
  { href: '/jobs',            label: 'Browse jobs',     Icon: Search },
  { href: '/apprenticeships', label: 'Apprenticeships', Icon: HardHat },
  { href: '/local-help',      label: 'Local help',      Icon: HeartHandshake },
  { href: '/caseworker',      label: 'Caseworker',      Icon: ClipboardList },
  { href: '/onboarding',      label: 'Profile',         Icon: UserCircle2 },
];

/**
 * Responsive nav. Four breakpoints, chosen so the rightmost icon is
 * never clipped at any common laptop viewport width:
 *
 *   < md   : logo + icon-only nav, no Search button. Pages still reachable
 *            via icons; ⌘K / "/" still opens the palette globally.
 *   md+    : Search button shows; nav stays icon-only.
 *   xl+    : "· Workforce Navigator" tagline appears next to the logo.
 *   2xl+   : nav labels appear ("Dashboard", "Browse jobs", …).
 *
 * Why labels live at 2xl, not xl: with 7 nav items + the search button +
 * the logo + tagline, the full-label nav exceeds the 1152px content
 * container at 1280–1535px viewports — clipping the rightmost item
 * (Profile avatar) just outside the header. Pushing labels to 2xl keeps
 * the icon-only layout for the most common laptop widths and only
 * expands to label form on actual desktop displays.
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
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl shadow-[0_1px_0_0_rgba(15,23,42,0.06)] supports-[backdrop-filter]:bg-white/70">
      {/* Top accent rule — keeps the page edge visually anchored on every
          breakpoint so the header never reads as 'floating' beneath the
          browser chrome. Subtle gradient avoids a heavy 'application bar'
          look while clearly marking the top of the page. */}
      <div className="h-0.5 w-full bg-gradient-to-r from-teal-600 via-teal-500 to-sunset-500" />
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
                  'group relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium transition ' +
                  (active
                    ? 'bg-teal-50 text-teal-700 shadow-[inset_0_-2px_0_0_rgb(13,148,136)]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                }
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden 2xl:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
