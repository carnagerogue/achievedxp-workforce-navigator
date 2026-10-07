'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, Command } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthControls } from './auth/AuthControls';
import { AUTH_ENABLED } from '../lib/auth-config';
import { SECTIONS, PROFILE_HREF, sectionForPath } from '../lib/navigation';
import { useLocalProfile } from '../lib/local-profile';
import { Avatar } from './common/Avatar';

/**
 * Global header. Five sections, always in the same order, with the current
 * one marked — on phones the same five live in the bottom tab bar, so the
 * header keeps only the logo, search and your profile. Section pages are
 * reached through the tabs under the header (SectionNav), never a mega menu.
 */
export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const current = sectionForPath(pathname);
  const [modMeta, setModMeta] = useState(false);

  useEffect(() => {
    setModMeta(typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const openPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/[0.08] bg-white/90 text-slate-900 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href={pathname === '/' ? '/' : '/dashboard'} className="flex shrink-0 items-center gap-3 rounded-md" aria-label="Achieve DXP home">
          <Image src="/logo.png" alt="Achieve DXP" width={170} height={40} priority className="h-7 w-auto sm:h-[30px]" />
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 md:flex lg:ml-8" aria-label="Main">
          {SECTIONS.map(({ key, href, label }) => {
            const active = current?.key === key;
            return (
              <Link key={key} href={href} aria-current={active ? 'page' : undefined}
                className={'whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors duration-150 ' +
                  (active ? 'bg-navy-900 font-semibold text-white' : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900')}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button type="button" onClick={openPalette}
          className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 text-xs font-medium text-slate-500 transition hover:border-teal-400 hover:text-navy-900 lg:inline-flex"
          aria-label="Search jobs and pages">
          <Search className="h-3.5 w-3.5" /> <span>Search</span>
          <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {modMeta ? <Command className="h-2.5 w-2.5" /> : 'Ctrl'}<span>K</span>
          </span>
        </button>
        <button type="button" onClick={openPalette}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-navy-900 lg:hidden"
          aria-label="Search jobs and pages">
          <Search className="h-5 w-5" />
        </button>

        {AUTH_ENABLED ? <AuthControls /> : <GuestProfileLink active={pathname === PROFILE_HREF} />}
      </div>
    </header>
  );
}

/**
 * Without accounts there is no account menu, so the profile you built in
 * setup is one tap away from every page instead.
 */
function GuestProfileLink({ active }: { active: boolean }) {
  const profile = useLocalProfile();
  if (!profile) return null;
  const name = (profile.displayName || profile.email?.split('@')[0] || '').trim();
  return (
    <Link href={PROFILE_HREF} title="Your profile" aria-label="Your profile"
      className={'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 transition ' + (active ? 'ring-teal-500' : 'ring-transparent hover:ring-teal-200')}>
      <Avatar name={name || 'You'} size={34} />
    </Link>
  );
}
