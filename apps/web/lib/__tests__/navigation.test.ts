import { describe, expect, it } from '@jest/globals';
import { existsSync } from 'fs';
import { join } from 'path';
import { ALL_PAGES, SECTIONS, isItemActive, sectionForPath } from '../navigation';
import { PHASES } from '../reentry-journey';
import { buildFocusQueue } from '../focus';

const appDir = join(__dirname, '..', '..', 'app');
const pageFileFor = (href: string) => join(appDir, ...href.split('/').filter(Boolean), 'page.tsx');

describe('navigation map', () => {
  it('points every menu entry at a page that exists', () => {
    for (const page of ALL_PAGES) expect(existsSync(pageFileFor(page.href))).toBe(true);
  });

  it('places every page in exactly one section, with one active tab', () => {
    for (const page of ALL_PAGES) {
      const owners = SECTIONS.filter((section) => section.items.some((item) => isItemActive(page.href, item)));
      expect(owners).toHaveLength(1);
      const activeTabs = owners[0].items.filter((item) => isItemActive(page.href, item));
      expect(activeTabs.map((item) => item.href)).toEqual([page.href]);
    }
  });

  it('keeps job detail and compare pages under Find jobs, and My jobs separate', () => {
    const jobs = SECTIONS.find((section) => section.key === 'jobs')!;
    const find = jobs.items.find((item) => item.href === '/jobs')!;
    const mine = jobs.items.find((item) => item.href === '/jobs/saved')!;
    expect(isItemActive('/jobs/greenhouse-stripe-1', find)).toBe(true);
    expect(isItemActive('/jobs/compare', find)).toBe(true);
    expect(isItemActive('/jobs/saved', find)).toBe(false);
    expect(isItemActive('/jobs/saved', mine)).toBe(true);
  });

  it('keeps the landing page, account entry, setup and staff tools outside the app sections', () => {
    for (const path of ['/', '/onboarding', '/sign-in', '/sign-up/verify', '/access', '/caseworker', '/caseworker/abc']) {
      expect(sectionForPath(path)).toBeNull();
    }
    expect(sectionForPath('/start')?.key).toBe('home');
  });
});

describe('next-step links land on a real place in My plan', () => {
  const planAnchors = ['#goal', '#roadmap', '#supervision', '#your-steps', '#checkin', '#corner'];

  it('sends every roadmap step to a page or a known My plan section', () => {
    for (const phase of PHASES) {
      for (const step of phase.steps) {
        const href = step.action?.href;
        if (!href || href.startsWith('tel:')) continue;
        const [path, hash] = href.split('#');
        expect(existsSync(pageFileFor(path.split('?')[0]))).toBe(true);
        if (hash) expect(planAnchors).toContain(`#${hash}`);
      }
    }
  });

  it('sends deadline items to the matching My plan section', () => {
    const queue = buildFocusQueue({
      supervision: { supervisionType: 'probation', nextReportDate: '2001-01-01' },
      conditions: [],
      fees: [],
      items: [{ id: 'a', name: 'Intake', type: 'Step', status: 'planned', targetDate: '2001-01-01', addedAt: 0 }],
      checkins: [],
      journeyNext: null,
    });
    expect(queue.find((entry) => entry.kind === 'report')?.href).toBe('/plan#supervision');
    expect(queue.find((entry) => entry.kind === 'plan')?.href).toBe('/plan#your-steps');
  });
});
