import {
  Compass, ListChecks, Briefcase, GraduationCap, LifeBuoy, Search, Bookmark, FileText,
  MessageSquareText, Link2, Brain, HardHat, Rocket, HandCoins, MapPin,
} from 'lucide-react';

/**
 * The product's one navigation map. Every page belongs to exactly one of five
 * sections, so a person always knows where they are and where everything
 * else lives. The header, the phone tab bar, the section tabs, the footer and
 * the ⌘K palette all read from here — nothing keeps its own copy of the menu.
 */

export type SectionKey = 'home' | 'plan' | 'jobs' | 'learn' | 'help';

type Icon = typeof Compass;

export interface NavItem {
  href: string;
  label: string;
  /** One plain-language line about what the page is for. */
  sub: string;
  Icon: Icon;
  /** Extra paths that count as this page (detail pages, legacy routes). */
  also?: (pathname: string) => boolean;
  /** Shown only to people who asked for record-aware guidance. */
  requiresJusticeSupport?: boolean;
}

export interface NavSection {
  key: SectionKey;
  label: string;
  href: string;
  Icon: Icon;
  sub: string;
  /** Pages inside the section, in the order they appear as tabs. */
  items: NavItem[];
}

const startsWith = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + '/');

export const SECTIONS: NavSection[] = [
  {
    key: 'home', label: 'Home', href: '/dashboard', Icon: Compass, sub: 'Your next step',
    items: [{ href: '/dashboard', label: 'Home', sub: 'Your next step', Icon: Compass, also: (p) => p === '/start' }],
  },
  {
    key: 'plan', label: 'My plan', href: '/plan', Icon: ListChecks, sub: 'Your roadmap and steps',
    items: [{ href: '/plan', label: 'My plan', sub: 'Your roadmap and steps', Icon: ListChecks }],
  },
  {
    key: 'jobs', label: 'Jobs', href: '/jobs', Icon: Briefcase, sub: 'Find, apply and track',
    items: [
      { href: '/jobs', label: 'Find jobs', sub: 'Jobs matched to you', Icon: Search,
        also: (p) => startsWith(p, '/jobs') && !startsWith(p, '/jobs/saved') },
      { href: '/jobs/saved', label: 'My jobs', sub: 'Saved jobs and applications', Icon: Bookmark },
      { href: '/apply-kit', label: 'Apply Kit', sub: 'Answers ready to paste', Icon: FileText },
      { href: '/background-statement', label: 'Background answer', sub: 'Prepare what to say', Icon: MessageSquareText, requiresJusticeSupport: true },
      { href: '/connections', label: 'Job accounts', sub: 'Link Indeed, LinkedIn and more', Icon: Link2 },
    ],
  },
  {
    key: 'learn', label: 'Learn', href: '/learn', Icon: GraduationCap, sub: 'Skills that raise your pay',
    items: [
      { href: '/learn', label: 'Free classes', sub: 'Free and low-cost skills', Icon: GraduationCap },
      { href: '/assessment', label: 'Career quiz', sub: 'Find work that fits you', Icon: Brain },
      { href: '/apprenticeships', label: 'Apprenticeships', sub: 'Earn while you learn', Icon: HardHat },
      { href: '/entrepreneurship', label: 'Start a business', sub: 'Work for yourself', Icon: Rocket },
    ],
  },
  {
    key: 'help', label: 'Help', href: '/resources', Icon: LifeBuoy, sub: 'Free support near you',
    items: [
      { href: '/resources', label: 'Free help & hotlines', sub: 'Food, housing, health, crisis', Icon: LifeBuoy },
      { href: '/benefits', label: 'Benefits checkup', sub: 'See what you qualify for', Icon: HandCoins },
      { href: '/local-help', label: 'Local help', sub: 'Job centers and programs near you', Icon: MapPin },
    ],
  },
];

export const PROFILE_HREF = '/onboarding';
export const CASEWORKER_HREF = '/caseworker';

export function isItemActive(pathname: string, item: NavItem): boolean {
  return pathname === item.href || (item.also?.(pathname) ?? false);
}

/** The section a path belongs to, or null for pages outside the app (landing, sign-in…). */
export function sectionForPath(pathname: string): NavSection | null {
  for (const section of SECTIONS) {
    if (section.items.some((item) => isItemActive(pathname, item))) return section;
  }
  return null;
}

/** Every page as a flat list, in menu order — for search and the footer. */
export const ALL_PAGES: NavItem[] = SECTIONS.flatMap((section) => section.items)
  .filter((item, index, list) => list.findIndex((other) => other.href === item.href) === index);
