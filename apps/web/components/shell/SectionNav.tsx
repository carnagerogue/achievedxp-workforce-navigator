'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sectionForPath, isItemActive } from '../../lib/navigation';
import { useLocalProfile } from '../../lib/local-profile';

/**
 * The pages inside the current section, as tabs under the header. Sections
 * with a single page (Home, My plan) need no tabs, so nothing renders there.
 */
export function SectionNav() {
  const pathname = usePathname() ?? '/';
  const profile = useLocalProfile();
  const section = sectionForPath(pathname);
  if (!section || section.items.length < 2) return null;

  const justiceSupport = profile?.justiceSupportEnabled === true;
  const items = section.items.filter((item) => !item.requiresJusticeSupport || justiceSupport || isItemActive(pathname, item));

  return (
    <div className="section-nav border-b border-slate-900/[0.08] bg-white">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <nav aria-label={`${section.label} pages`} className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = isItemActive(pathname, item);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                className={'inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3.5 text-sm transition-colors ' +
                  (active ? 'border-teal-600 font-semibold text-navy-900' : 'border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-navy-900')}>
                <item.Icon className={'h-4 w-4 ' + (active ? 'text-teal-600' : 'text-slate-400')} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
