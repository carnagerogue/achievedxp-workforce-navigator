'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutDashboard, UserCircle2, Briefcase, ArrowRight, Command, GitCompare, HardHat, Brain, HeartHandshake,
} from 'lucide-react';
import { listJobs } from '../lib/api';
import type { JobDto } from '@dxp/shared';
import { useDebounce } from '../lib/use-debounce';
import { prettyIndustry } from '../lib/format';

/**
 * Global ⌘K / Ctrl+K palette.
 *
 * Design choices:
 *  - Pure-React modal (no new dep). Tailwind handles the look.
 *  - First section is static navigation; the rest is live job search.
 *  - Debounced API call (250ms) so we don't spam the server.
 *  - Arrow keys + Enter drive selection; Escape closes.
 */
type CommandItem =
  | { kind: 'nav';  label: string; sub?: string; href: string;  Icon: typeof Command }
  | { kind: 'job';  label: string; sub: string;  job: JobDto;   Icon: typeof Command };

const NAV_ITEMS: CommandItem[] = [
  { kind: 'nav', label: 'Dashboard',         sub: 'Your matches and saved jobs',           href: '/dashboard',       Icon: LayoutDashboard },
  { kind: 'nav', label: 'Browse jobs',       sub: 'Filter by city, ZIP, industry',         href: '/jobs',            Icon: Briefcase       },
  { kind: 'nav', label: 'Apprenticeships',   sub: 'Earn-while-you-learn pathways',         href: '/apprenticeships', Icon: HardHat         },
  { kind: 'nav', label: 'Local help',        sub: 'Job centers + reentry programs near you', href: '/local-help',    Icon: HeartHandshake  },
  { kind: 'nav', label: 'Career Assessment', sub: 'RIASEC interest profiler (5 min)',      href: '/assessment',      Icon: Brain           },
  { kind: 'nav', label: 'Compare jobs',      sub: 'Side-by-side view of your picks',       href: '/jobs/compare',    Icon: GitCompare      },
  { kind: 'nav', label: 'Profile',           sub: 'Edit skills, certifications, history',  href: '/onboarding',      Icon: UserCircle2     },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);
  const dq = useDebounce(q, 250);

  // Global hotkey — ⌘K (mac) or Ctrl+K (win/linux). Also '/' when nothing is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typingInField =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typingInField && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset state when the modal closes; focus the input when it opens.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    else { setQ(''); setJobs([]); setActive(0); }
  }, [open]);

  // Live job search.
  useEffect(() => {
    if (!open) return;
    if (!dq.trim()) { setJobs([]); return; }
    setLoading(true);
    listJobs({ q: dq, limit: 8 })
      .then((d) => setJobs(d.results))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [open, dq]);

  const items: CommandItem[] = useMemo(() => {
    const nav = q.trim()
      ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q.toLowerCase()))
      : NAV_ITEMS;
    const jobItems: CommandItem[] = jobs.map((j) => ({
      kind: 'job',
      label: j.title,
      sub: [j.company, j.locationCity, j.locationRegion, prettyIndustry(j.industry)]
        .filter(Boolean).join(' · '),
      job: j,
      Icon: Briefcase,
    }));
    return [...nav, ...jobItems];
  }, [q, jobs]);

  // Keep `active` inside bounds as the list shrinks/grows.
  useEffect(() => { setActive((a) => Math.min(a, Math.max(0, items.length - 1))); }, [items.length]);

  const run = (item: CommandItem) => {
    setOpen(false);
    if (item.kind === 'nav') router.push(item.href);
    else                     router.push(`/jobs/${item.job.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); run(items[active]); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-24 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search jobs, companies, pages…"
            className="w-full bg-transparent py-3.5 text-sm placeholder:text-slate-400 focus:outline-none"
            aria-autocomplete="list"
            aria-controls="cmdk-list"
          />
          <span className="ml-auto flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            <Command className="h-3 w-3" />K
          </span>
        </div>

        <ul ref={listRef} id="cmdk-list" role="listbox" className="max-h-80 overflow-auto p-1.5">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-slate-500">
              {loading ? 'Searching…' : (q ? `No results for "${q}"` : 'Start typing to search jobs…')}
            </li>
          ) : (
            <>
              {items[0]?.kind === 'nav' && (
                <li className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Navigation</li>
              )}
              {items.map((item, i) => {
                const isFirstJob = item.kind === 'job' && (i === 0 || items[i - 1].kind !== 'job');
                return (
                  <>
                    {isFirstJob && (
                      <li key={`jobs-heading`} className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Jobs {loading && <span className="ml-1 text-slate-300">searching…</span>}
                      </li>
                    )}
                    <li key={(item.kind === 'job' ? item.job.id : item.href) + i}>
                      <button
                        type="button"
                        onClick={() => run(item)}
                        onMouseEnter={() => setActive(i)}
                        className={
                          'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition ' +
                          (i === active ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50')
                        }
                        role="option"
                        aria-selected={i === active}
                      >
                        <item.Icon className={'mt-0.5 h-4 w-4 shrink-0 ' + (i === active ? 'text-teal-700' : 'text-slate-400')} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.label}</p>
                          {item.sub && <p className="truncate text-xs text-slate-500">{item.sub}</p>}
                        </div>
                        <ArrowRight className={'mt-1 h-3.5 w-3.5 shrink-0 ' + (i === active ? 'text-teal-600' : 'text-slate-300')} />
                      </button>
                    </li>
                  </>
                );
              })}
            </>
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <span>
            <kbd className="rounded border border-slate-300 bg-white px-1">↑</kbd>{' '}
            <kbd className="rounded border border-slate-300 bg-white px-1">↓</kbd>{' '}navigate
          </span>
          <span>
            <kbd className="rounded border border-slate-300 bg-white px-1">Enter</kbd> open
          </span>
          <span>
            <kbd className="rounded border border-slate-300 bg-white px-1">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
