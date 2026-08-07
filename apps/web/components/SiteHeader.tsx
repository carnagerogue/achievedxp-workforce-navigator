'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Search, UserCircle2, Command, HardHat, HeartHandshake, ClipboardList,
  Compass, Rocket, GraduationCap, LifeBuoy, HandCoins, MapPin, Briefcase, Menu, X, ChevronDown,
  ListChecks, Brain, MessageSquareQuote, FileText, Link2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AuthControls } from './auth/AuthControls';

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
    title: 'Apply anywhere',
    items: [
      { href: '/apply-kit', label: 'Apply Kit', sub: 'Fill it once, reuse everywhere', Icon: FileText },
      { href: '/connections', label: 'Connections', sub: 'Link your job accounts', Icon: Link2 },
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
    <header className="sticky top-0 z-30 border-b border-navy-900/10 bg-white/90 text-slate-900 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-[1440px] items-center gap-2 px-4 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded-md" aria-label="Achieve DXP home">
          <Image src="/logo.png" alt="Achieve DXP" width={170} height={40} priority className="h-[30px] w-auto" />
          <span className="hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 lg:inline">Workforce Navigator</span>
        </Link>

        <div className="flex-1" />

        {/* Primary links — quiet text, a single dot marks where you are */}
        <nav className="hidden items-center sm:flex">
          {PRIMARY.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href}
                className={'relative whitespace-nowrap rounded-lg px-3.5 py-2 text-sm transition-colors duration-150 ' +
                  (active ? 'font-semibold text-navy-900' : 'font-medium text-slate-500 hover:text-navy-900')}
                aria-current={active ? 'page' : undefined}>
                {label}
                {active && <span aria-hidden="true" className="absolute inset-x-3.5 -bottom-[13px] h-[2px] bg-teal-600" />}
              </Link>
            );
          })}
        </nav>

        <div className="mx-1 hidden h-5 w-px bg-navy-900/10 sm:block" />

        {/* Search (palette) */}
        <button type="button" onClick={openPalette}
          className="hidden shrink-0 items-center gap-2 border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 text-xs font-medium text-slate-500 hover:border-teal-400 hover:text-navy-900 md:inline-flex"
          aria-label="Search">
          <Search className="h-3.5 w-3.5" /> <span>Search</span>
          <span className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            {modMeta ? <Command className="h-2.5 w-2.5" /> : 'Ctrl'}<span>K</span>
          </span>
        </button>
        <button type="button" onClick={openPalette} className="inline-flex shrink-0 items-center justify-center p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-700 md:hidden" aria-label="Search">
          <Search className="h-5 w-5" />
        </button>

        {/* Explore / Menu trigger — the one filled control in the chrome */}
        <button type="button" onClick={() => setOpen((v) => !v)}
          className={'inline-flex shrink-0 items-center gap-1.5 border px-4 py-2 text-sm font-semibold ' +
            (open ? 'border-teal-700 bg-teal-700 text-white' : 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700')}
          aria-expanded={open} aria-haspopup="true" aria-label="Explore all tools">
          <Menu className="h-4 w-4 sm:hidden" aria-hidden="true" />
          <span className="hidden sm:inline">Explore</span>
          <ChevronDown className={'hidden h-3.5 w-3.5 transition-transform duration-200 sm:inline ' + (open ? 'rotate-180' : '')} aria-hidden="true" />
          <span className="sm:hidden">Menu</span>
        </button>

        {/* Account — renders only when accounts are enabled */}
        <AuthControls />
      </div>

      {/* Menu panel */}
      {open && (
        <>
          <button className="fixed inset-0 z-20 cursor-default bg-navy-900/45 backdrop-blur-[2px]" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
          <div ref={menuRef} className="absolute inset-x-3 top-full z-30 mt-2 sm:inset-x-auto sm:right-6 sm:w-[640px]">
            <div className="animate-slide-up overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-pop">
              {/* Featured: the guided home */}
              <Link href="/dashboard" className="group flex items-center gap-3.5 border-b border-slate-200 px-5 py-4 transition-colors hover:bg-teal-50">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-teal-600 bg-teal-600 text-white transition-transform duration-200 group-hover:scale-105"><Compass className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold tracking-tight text-navy-900">Your next step</span>
                  <span className="block text-xs text-slate-500">The reentry compass — one step at a time, in the order that works.</span>
                </span>
                <span className="text-xs font-semibold text-teal-700 opacity-0 transition-opacity duration-150 group-hover:opacity-100">Open</span>
              </Link>

              <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
                {GROUPS.map((g) => (
                  <div key={g.title}>
                    <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sunset-600">{g.title}</p>
                    <ul>
                      {g.items.map((it) => {
                        const active = isActive(pathname, it.href);
                        return (
                          <li key={it.href + it.label}>
                            <Link href={it.href}
                              className={'group flex items-center gap-3 px-2 py-[7px] transition-colors duration-150 ' + (active ? 'bg-teal-50' : 'hover:bg-slate-50')}>
                              <span className={'inline-flex h-8 w-8 shrink-0 items-center justify-center border transition-colors ' + (active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-500 group-hover:border-teal-300 group-hover:text-teal-700')}><it.Icon className="h-4 w-4" strokeWidth={1.75} /></span>
                              <span className="min-w-0">
                                <span className={'block text-sm ' + (active ? 'font-semibold text-teal-800' : 'font-medium text-navy-900')}>{it.label}</span>
                                <span className="block text-[11px] leading-tight text-slate-500">{it.sub}</span>
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
