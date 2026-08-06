'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Search, UserCircle2, Command, HardHat, HeartHandshake, ClipboardList,
  Compass, Rocket, GraduationCap, LifeBuoy, HandCoins, MapPin, Briefcase, Menu, X, ChevronDown,
  ListChecks, Brain, MessageSquareQuote,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Item = { href: string; label: string; sub: string; Icon: typeof Compass };

// Always-visible primary links (desktop) — the product's spine, in journey
// order: your guided home, your working plan, then the job hunt.
const PRIMARY: Item[] = [
  { href: '/dashboard', label: 'Home', sub: 'Your next step', Icon: Compass },
  { href: '/plan', label: 'My plan', sub: 'Steps & check-ins', Icon: ListChecks },
  { href: '/jobs', label: 'Find a job', sub: 'Fair-chance matches', Icon: Briefcase },
];

// The full, categorized menu — the ONE complete inventory of the product
// (the footer and ⌘K palette mirror it), grouped so anything is one tap away.
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Find work',
    items: [
      { href: '/jobs', label: 'Find a job', sub: 'Fair-chance matches', Icon: Briefcase },
      { href: '/apprenticeships', label: 'Apprenticeships', sub: 'Earn while you learn', Icon: HardHat },
      { href: '/assessment', label: 'Career quiz', sub: 'What fits you (5 min)', Icon: Brain },
      { href: '/background-statement', label: 'Tell your story', sub: 'Talking about your record', Icon: MessageSquareQuote },
      { href: '/learn', label: 'Learn new skills', sub: 'Free & low-cost', Icon: GraduationCap },
      { href: '/entrepreneurship', label: 'Be your own boss', sub: 'Start a business', Icon: Rocket },
    ],
  },
  {
    title: 'Get support',
    items: [
      { href: '/resources', label: 'Free help & hotlines', sub: 'Food, health, housing…', Icon: LifeBuoy },
      { href: '/benefits', label: 'Benefits checkup', sub: 'What you qualify for', Icon: HandCoins },
      { href: '/local-help', label: 'Local help', sub: 'Job centers near you', Icon: MapPin },
    ],
  },
  {
    title: 'Your journey',
    items: [
      { href: '/dashboard', label: 'Home', sub: 'Next step & compass', Icon: LayoutDashboard },
      { href: '/plan', label: 'My plan', sub: 'Steps, readiness, supervision', Icon: ListChecks },
      { href: '/onboarding', label: 'Match profile', sub: 'Improve your job matches', Icon: UserCircle2 },
    ],
  },
  {
    title: 'For caseworkers',
    items: [
      { href: '/caseworker', label: 'Command center', sub: 'Your caseload', Icon: ClipboardList },
    ],
  },
];

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

/**
 * Global navigation. A few labeled primary links plus a single categorized
 * "Explore" menu (desktop dropdown / mobile full menu) so every tool is
 * findable with a clear label — phone-first and low-jargon. ⌘K still opens the
 * command palette for power users.
 */
export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const [modMeta, setModMeta] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setModMeta(typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  // Close the menu on navigation and on Escape.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openPalette = () => {
    setOpen(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl shadow-[0_1px_0_0_rgba(15,23,42,0.06)] supports-[backdrop-filter]:bg-white/70">
      <div className="h-0.5 w-full bg-gradient-to-r from-teal-600 via-teal-500 to-sunset-500" />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded-md" aria-label="Achieve DXP home">
          <Image src="/logo.png" alt="Achieve DXP" width={170} height={40} priority className="h-8 w-auto" />
          <span className="hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:inline">· Workforce Navigator</span>
        </Link>

        <div className="flex-1" />

        {/* Primary labeled links (tablet/desktop) */}
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {PRIMARY.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href}
                className={'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition ' +
                  (active ? 'bg-teal-50 text-teal-700 shadow-[inset_0_-2px_0_0_rgb(13,148,136)]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}
                aria-current={active ? 'page' : undefined}>
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </Link>
            );
          })}
        </nav>

        {/* Search (palette) */}
        <button type="button" onClick={openPalette}
          className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 md:inline-flex"
          aria-label="Search">
          <Search className="h-3.5 w-3.5" /> <span>Search…</span>
          <span className="ml-1 flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-500">
            {modMeta ? <Command className="h-2.5 w-2.5" /> : 'Ctrl'}<span>K</span>
          </span>
        </button>
        <button type="button" onClick={openPalette} className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Search">
          <Search className="h-5 w-5" />
        </button>

        {/* Explore / Menu trigger */}
        <button type="button" onClick={() => setOpen((v) => !v)}
          className={'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ' +
            (open ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100')}
          aria-expanded={open} aria-haspopup="true" aria-label="Explore all tools">
          <Menu className="h-4 w-4 sm:hidden" aria-hidden="true" />
          <span className="hidden sm:inline">Explore</span>
          <ChevronDown className={'hidden h-4 w-4 transition sm:inline ' + (open ? 'rotate-180' : '')} aria-hidden="true" />
          <span className="sm:hidden">Menu</span>
        </button>
      </div>

      {/* Menu panel */}
      {open && (
        <>
          <button className="fixed inset-0 z-20 cursor-default bg-navy-900/10" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
          <div ref={menuRef} className="absolute inset-x-3 top-full z-30 mt-1 sm:inset-x-auto sm:right-6 sm:mt-2 sm:w-[680px]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover">
              {/* Featured: the guided home */}
              <Link href="/dashboard" className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-br from-teal-50 to-white px-4 py-3 transition hover:bg-teal-50">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white"><Compass className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy-900">Your next step — the reentry compass</span>
                  <span className="block text-xs text-slate-600">One step at a time, in the order that works.</span>
                </span>
              </Link>

              <div className="grid gap-x-4 gap-y-4 p-4 sm:grid-cols-2">
                {GROUPS.map((g) => (
                  <div key={g.title}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.title}</p>
                    <ul className="space-y-0.5">
                      {g.items.map((it) => {
                        const active = isActive(pathname, it.href);
                        return (
                          <li key={it.href + it.label}>
                            <Link href={it.href}
                              className={'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition ' + (active ? 'bg-teal-50' : 'hover:bg-slate-50')}>
                              <span className={'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + (active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600')}><it.Icon className="h-4 w-4" /></span>
                              <span className="min-w-0">
                                <span className={'block text-sm font-semibold ' + (active ? 'text-teal-700' : 'text-navy-900')}>{it.label}</span>
                                <span className="block text-[11px] text-slate-500">{it.sub}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
