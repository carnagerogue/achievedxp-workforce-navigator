'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTIONS, sectionForPath } from '../../lib/navigation';

/**
 * Phone navigation: the same five sections as the desktop header, pinned to
 * the bottom where a thumb can reach them. Hidden on desktop and on pages
 * outside the app (landing, sign-in, setup).
 */
export function MobileTabBar() {
  const pathname = usePathname() ?? '/';
  const current = sectionForPath(pathname);
  if (!current) return null;

  return (
    <>
      {/* Keeps the last bit of every page clear of the fixed bar. */}
      <div aria-hidden="true" className="h-[calc(4.25rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav aria-label="Main" className="mobile-tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-slate-900/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {SECTIONS.map(({ key, href, label, Icon }) => {
            const active = current.key === key;
            return (
              <li key={key}>
                <Link href={href} aria-current={active ? 'page' : undefined}
                  className={'relative flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ' +
                    (active ? 'text-teal-700' : 'text-slate-500 hover:text-navy-900')}>
                  {active && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-teal-600" />}
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
