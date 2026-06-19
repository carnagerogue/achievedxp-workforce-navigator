'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, MapPin, Phone, Globe, Clock, HeartHandshake, Search as SearchIcon,
  AlertCircle, ExternalLink, Map, LifeBuoy, Home, Utensils, Bus, Scale,
  HeartPulse, Wallet, Baby, Shirt, GraduationCap, ListChecks, Plus, Check,
  Printer, Trash2, Share2, FileDown, Sparkles, AlertTriangle, CalendarClock, Flame,
} from 'lucide-react';
import {
  getAjcCenters,
  getReentryPrograms,
  getCommunityResources,
  type AjcCenter,
  type AjcCentersResponse,
  type CommunityResponse,
  type CommunityLiveResource,
} from '../../lib/api';
import { Skeleton } from '../../components/Skeleton';
import { useDebounce } from '../../lib/use-debounce';
import {
  useChecklist, useOwnerName, usePlanGoals, isInChecklist, toggleChecklist, removeFromChecklist,
  setChecklistStatus, setChecklistNotes, setChecklistTargetDate, setOwnerName, setPlanGoals,
  clearChecklist, importChecklist, useCheckins, addCheckin, removeCheckin,
  type ChecklistItem, type ChecklistStatus, type CheckIn,
} from '../../lib/checklist-store';
import { Avatar } from '../../components/common/Avatar';
import { ProgressRing } from '../../components/common/ProgressRing';
import { PlanShareDialog } from '../../components/plan/PlanShareDialog';
import { PlanImportDialog } from '../../components/plan/PlanImportDialog';
import {
  checklistToPortable, portableToChecklist, type PortablePlan,
} from '../../lib/plan-transfer';
import {
  progressPct, countByStatus, overdueItems, dueSoonItems, nextStep, momentum,
} from '../../lib/plan-progress';

/**
 * In-person resources page. Two tabs of CareerOneStop / DOL data:
 *   - American Job Centers — ~3,000 federally-funded one-stops nationwide.
 *     Free help with job search, training, benefits, resume.
 *   - Reentry programs — orgs serving justice-impacted candidates
 *     specifically (transitional housing, fair-chance employment,
 *     workforce training, expungement clinics, etc.)
 *
 * Both lookups run server-side via our /careeronestop proxy so the
 * CareerOneStop token never reaches the browser.
 */
export default function LocalHelpPage() {
  const [tab, setTab] = useState<'ajc' | 'reentry' | 'community' | 'checklist'>('ajc');
  const [location, setLocation] = useState('44113');
  const [radius, setRadius] = useState(50);
  const dLoc = useDebounce(location, 400);
  const checklist = useChecklist();

  return (
    <div className="animate-fade-in">
      <header className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <HeartHandshake className="h-3.5 w-3.5" /> Local help
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          In-person resources near you
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          American Job Centers offer free help with job search, training, and benefits.
          Reentry programs serve justice-impacted candidates with fair-chance jobs,
          transitional services, and expungement clinics.
        </p>

        <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              ZIP code or city, state
            </span>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 44113 or Cleveland, OH"
                className="block w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">
              Radius · {radius} mi
            </span>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="block w-full accent-teal-600"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          <TabButton active={tab === 'ajc'} onClick={() => setTab('ajc')}>
            <Building2 className="h-4 w-4" /> American Job Centers
          </TabButton>
          <TabButton active={tab === 'reentry'} onClick={() => setTab('reentry')}>
            <HeartHandshake className="h-4 w-4" /> Reentry Programs
          </TabButton>
          <TabButton active={tab === 'community'} onClick={() => setTab('community')}>
            <LifeBuoy className="h-4 w-4" /> Community Resources
          </TabButton>
          <TabButton active={tab === 'checklist'} onClick={() => setTab('checklist')}>
            <ListChecks className="h-4 w-4" /> My Plan
            {checklist.length > 0 && (
              <span className={
                'ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ' +
                (tab === 'checklist' ? 'bg-white/25 text-white' : 'bg-teal-600 text-white')
              }>
                {checklist.length}
              </span>
            )}
          </TabButton>
        </div>
      </header>

      <div className="mt-6">
        {tab === 'ajc' && <AjcResults location={dLoc} radius={radius} />}
        {tab === 'reentry' && <ReentryResults location={dLoc} radius={radius} />}
        {tab === 'community' && <CommunityResources location={dLoc} />}
        {tab === 'checklist' && <ChecklistView />}
      </div>

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-xs text-slate-600">
        Job centers &amp; reentry programs from{' '}
        <a href="https://www.careeronestop.org" target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">
          CareerOneStop
        </a>{' '}
        (U.S. Department of Labor). Community resources are vetted national programs and official
        government locators. Free to use; no account required.
      </footer>
    </div>
  );
}

/** "Add to my plan" toggle used on every resource card. */
function ChecklistToggle({ item }: { item: Omit<ChecklistItem, 'status' | 'addedAt'> }) {
  useChecklist(); // re-render on changes
  const inList = isInChecklist(item.id);
  return (
    <button
      type="button"
      onClick={() => toggleChecklist(item)}
      aria-pressed={inList}
      title="Track this resource on your reentry plan to share progress with your officer or caseworker"
      className={
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
        (inList
          ? 'border border-teal-600 bg-teal-50 text-teal-700'
          : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700')
      }
    >
      {inList ? <><Check className="h-3.5 w-3.5" /> On my plan</> : <><Plus className="h-3.5 w-3.5" /> Add to my plan</>}
    </button>
  );
}

/**
 * Wraparound community services (housing, food, transport, legal/record
 * clearing, health, money, childcare, clothing, education) — the supports a
 * justice-impacted job seeker needs to keep a job.
 *
 * Pick a category tile and resources render IN-APP (no leaving the site) via
 * /api/v1/community. Where a free government API exists for the category we
 * show REAL LOCAL results ("Near you" — today SAMHSA for health/recovery);
 * every category also lists vetted national programs. Each can be added to the
 * checklist. No third-party redirect.
 */
const COMMUNITY_CATEGORIES: Array<{ key: string; label: string; term: string; desc: string; Icon: typeof Home }> = [
  { key: 'housing',   label: 'Housing',            term: 'housing',              desc: 'Emergency shelter, rent & utility help, transitional housing.', Icon: Home },
  { key: 'food',      label: 'Food',               term: 'food',                 desc: 'Food pantries, free meals, SNAP & benefits help.',             Icon: Utensils },
  { key: 'transit',   label: 'Transportation',     term: 'transportation',       desc: 'Bus passes, gas help, rides to work or appointments.',         Icon: Bus },
  { key: 'legal',     label: 'Legal & records',    term: 'expungement',          desc: 'Record-clearing & expungement clinics, legal aid, ID help.',   Icon: Scale },
  { key: 'health',    label: 'Health & recovery',  term: 'addiction',            desc: 'Clinics, mental health, addiction & recovery support.',        Icon: HeartPulse },
  { key: 'money',     label: 'Money help',         term: 'financial assistance', desc: 'Emergency cash, benefits navigation, financial coaching.',     Icon: Wallet },
  { key: 'family',    label: 'Childcare & family', term: 'childcare',            desc: 'Childcare assistance, parenting & family support.',            Icon: Baby },
  { key: 'clothing',  label: 'Interview clothing', term: 'clothing',             desc: 'Free interview-ready clothing & professional attire.',         Icon: Shirt },
  { key: 'education', label: 'Education & skills', term: 'education',             desc: 'GED, adult education, skills training, tutoring.',             Icon: GraduationCap },
];

function CommunityResources({ location }: { location: string }) {
  const [active, setActive] = useState('housing');
  const [data, setData] = useState<CommunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const cat = COMMUNITY_CATEGORIES.find((c) => c.key === active) ?? COMMUNITY_CATEGORIES[0];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommunityResources(active, location)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [active, location]);

  const local = data?.local ?? [];
  const national = data?.national ?? [];

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {COMMUNITY_CATEGORIES.map(({ key, label, Icon }) => {
          const on = active === key;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setActive(key)}
                className={
                  'flex w-full flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition ' +
                  (on
                    ? 'border-teal-600 bg-teal-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-card-hover')
                }
              >
                <span className={'flex h-9 w-9 items-center justify-center rounded-xl ' + (on ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700')}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={'text-sm font-semibold ' + (on ? 'text-teal-800' : 'text-navy-900')}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-navy-900">{cat.label}</h3>
          <p className="text-xs text-slate-500">{cat.desc}</p>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : (
          <>
            {local.length > 0 && (
              <section className="mb-5">
                <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                  <MapPin className="h-3.5 w-3.5" /> Near you{data?.source ? ` · ${data.source}` : ''}
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {local.map((r) => <CommunityResourceCard key={r.id} resource={r} category={cat.label} />)}
                </ul>
              </section>
            )}

            <section>
              {local.length > 0 && (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Trusted national programs
                </p>
              )}
              <ul className="grid gap-3 sm:grid-cols-2">
                {national.map((r) => <CommunityResourceCard key={r.id} resource={r} category={cat.label} />)}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function CommunityResourceCard({ resource, category }: { resource: CommunityLiveResource; category: string }) {
  const cleanPhone = (resource.phone ?? '').replace(/[^\d]/g, '');
  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold text-navy-900">{resource.name}</h4>
        {resource.distance && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{resource.distance} mi</span>
        )}
      </div>
      {resource.desc && <p className="mt-1 text-sm leading-relaxed text-slate-600">{resource.desc}</p>}
      {(resource.address || resource.cityState) && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{[resource.address, resource.cityState].filter(Boolean).join(', ')}</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {cleanPhone && (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <Phone className="h-3 w-3" /> {resource.phone}
          </a>
        )}
        {resource.url && (
          <a
            href={resource.url.startsWith('http') ? resource.url : `https://${resource.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <Globe className="h-3 w-3" /> Website <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <ChecklistToggle
          item={{
            id: resource.id,
            name: resource.name,
            type: 'Support service',
            category,
            address: resource.address,
            cityState: resource.cityState,
            phone: resource.phone,
            url: resource.url,
            distance: resource.distance,
          }}
        />
      </div>
    </li>
  );
}

// ─────────────────────────── Reentry action plan ───────────────────────────

const STATUS_META: Record<ChecklistStatus, { label: string; cls: string; mark: string }> = {
  planned:   { label: 'Planned',   cls: 'bg-slate-100 text-slate-700', mark: '☐' },
  contacted: { label: 'Contacted', cls: 'bg-amber-100 text-amber-800', mark: '◔' },
  scheduled: { label: 'Scheduled', cls: 'bg-sky-100 text-sky-800',     mark: '◑' },
  completed: { label: 'Completed', cls: 'bg-teal-100 text-teal-800',   mark: '☑' },
};
const STATUS_ORDER: ChecklistStatus[] = ['planned', 'contacted', 'scheduled', 'completed'];

function fmtPlanDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function printPlan(owner: string, goals: string, items: ChecklistItem[], checkins: CheckIn[] = []) {
  const win = window.open('', '_blank', 'width=820,height=1000');
  if (!win) return;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const esc = (s: string) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  const count = (s: ChecklistStatus) => items.filter((i) => i.status === s).length;
  const pct = items.length ? Math.round((count('completed') / items.length) * 100) : 0;
  const wins = items.filter((i) => i.status === 'completed');
  const upcoming = items.filter((i) => i.status !== 'completed' && i.targetDate);
  const winsHtml = wins.length ? `<div class="block"><div class="lbl">Completed — wins</div><ul>${wins.map((w) => `<li>${esc(w.name)}${w.notes ? ` — ${esc(w.notes)}` : ''}</li>`).join('')}</ul></div>` : '';
  const upHtml = upcoming.length ? `<div class="block"><div class="lbl">Upcoming commitments</div><ul>${upcoming.map((u) => `<li>${esc(fmtPlanDate(u.targetDate))} — ${esc(u.name)}</li>`).join('')}</ul></div>` : '';
  const ciHtml = checkins.length ? `<div class="block"><div class="lbl">Recent weekly check-ins</div><ul>${checkins.slice(0, 6).map((c) => `<li>${esc(fmtPlanDate(c.date))} · ${c.rating}/5${c.note ? ` — ${esc(c.note)}` : ''}</li>`).join('')}</ul></div>` : '';
  const rows = items.map((it) => `
    <tr>
      <td class="st"><span class="mark">${STATUS_META[it.status].mark}</span> ${STATUS_META[it.status].label}</td>
      <td>
        <div class="name">${esc(it.name)}</div>
        <div class="meta">${esc(it.type)}${it.category ? ' · ' + esc(it.category) : ''}</div>
        ${it.cityState ? `<div class="meta">${esc([it.address, it.cityState].filter(Boolean).join(', '))}</div>` : ''}
        ${it.phone ? `<div class="meta">${esc(it.phone)}</div>` : ''}
      </td>
      <td class="date">${esc(fmtPlanDate(it.targetDate)) || '—'}</td>
      <td class="notes">${esc(it.notes || '') || '—'}</td>
    </tr>`).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reentry Action Plan &amp; Progress Report</title>
    <style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:32px;font-size:13px}
      h1{font-size:20px;margin:0 0 2px} .tag{color:#0f766e;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .sub{color:#475569;margin:2px 0} .goals{margin:12px 0 0;padding:10px 12px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px}
      .goals .lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#0f766e}
      .summary{margin-top:12px;color:#334155} .summary b{color:#0f172a}
      .pct{font-size:15px;font-weight:800;color:#0f766e}
      .bar{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin:6px 0 0;max-width:320px} .bar i{display:block;height:100%;background:#0d9488}
      .block{margin-top:14px} .block .lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#0f766e;margin-bottom:3px}
      .block ul{margin:0;padding-left:18px} .block li{margin:2px 0;color:#334155}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid #e2e8f0}
      th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
      .st{white-space:nowrap;font-weight:600} .mark{font-size:15px} .name{font-weight:600} .meta{color:#475569;font-size:12px}
      .date{white-space:nowrap} .notes{color:#334155}
      .sign{margin-top:30px;display:flex;gap:48px} .sign div{flex:1;border-top:1px solid #94a3b8;padding-top:4px;color:#475569;font-size:11px}
      .foot{margin-top:18px;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;padding-top:10px}
      @media print{body{margin:16px}}
    </style></head><body>
    <div class="tag">Achieve DXP · Workforce Navigator</div>
    <h1>Reentry Action Plan &amp; Progress Report</h1>
    <p class="sub"><strong>Prepared by:</strong> ${esc(owner || '—')} &nbsp;·&nbsp; <strong>Date:</strong> ${today}</p>
    ${goals.trim() ? `<div class="goals"><div class="lbl">My goals</div>${esc(goals)}</div>` : ''}
    <p class="summary"><span class="pct">${pct}% complete</span> &nbsp;·&nbsp; <b>${items.length}</b> on plan &nbsp;·&nbsp; <b>${count('completed')}</b> completed &nbsp;·&nbsp; <b>${count('scheduled')}</b> scheduled &nbsp;·&nbsp; <b>${count('contacted')}</b> contacted &nbsp;·&nbsp; <b>${count('planned')}</b> planned</p>
    <div class="bar"><i style="width:${pct}%"></i></div>
    ${winsHtml}${upHtml}
    <table>
      <thead><tr><th>Status</th><th>Resource &amp; need</th><th>Target&nbsp;date</th><th>Plan / next step / outcome</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${ciHtml}
    <div class="sign"><div>Participant signature / date</div><div>Officer / case manager signature / date</div></div>
    <p class="foot">Self-reported progress toward reentry goals. Job centers and reentry programs sourced from the U.S. Department of Labor (CareerOneStop); community resources are vetted national programs and official government locators.</p>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

const MOMENTUM_META = {
  rising: { label: 'Rising', cls: 'bg-teal-50 text-teal-700 ring-teal-200' },
  steady: { label: 'Steady', cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
  stalled: { label: 'Let’s get moving', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
} as const;

function ChecklistView() {
  const items = useChecklist();
  const owner = useOwnerName();
  const goals = usePlanGoals();
  const checkins = useCheckins();
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const pct = progressPct(items);
  const counts = countByStatus(items);
  const next = nextStep(items);
  const overdue = overdueItems(items);
  const soon = dueSoonItems(items);
  const mo = MOMENTUM_META[momentum(items)];

  const handleImport = (plan: PortablePlan, mode: 'replace' | 'merge') => {
    importChecklist(portableToChecklist(plan), mode);
    setShowImport(false);
  };

  const dialogs = (
    <>
      {showShare && (
        <PlanShareDialog plan={checklistToPortable(items, owner, goals)} audience="caseworker" onClose={() => setShowShare(false)} />
      )}
      {showImport && (
        <PlanImportDialog
          title="Import a plan"
          hint="Paste a code or upload a file your caseworker shared with you."
          allowMerge
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
        {dialogs}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <ListChecks className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-navy-900">Build your reentry plan</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Browse <strong>Job Centers</strong>, <strong>Reentry Programs</strong>, and{' '}
          <strong>Community Resources</strong>, then tap <em>Add to my plan</em>. Track where you are,
          set dates, and print a progress report for your parole or probation officer.
        </p>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700"
        >
          <FileDown className="h-4 w-4" /> Import a plan from my caseworker
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dialogs}

      {/* Dashboard header */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 px-5 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_90%_-20%,rgba(45,212,229,0.25),transparent)]" />
          <div className="relative flex items-center gap-4">
            <Avatar name={owner || 'You'} size={52} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white">{owner ? `${owner}’s plan` : 'Your reentry plan'}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <StatusChip label="Completed" n={counts.completed ?? 0} cls="bg-teal-400/20 text-teal-50 ring-teal-300/30" />
                <StatusChip label="Scheduled" n={counts.scheduled ?? 0} cls="bg-sky-400/20 text-sky-50 ring-sky-300/30" />
                <StatusChip label="Contacted" n={counts.contacted ?? 0} cls="bg-amber-400/20 text-amber-50 ring-amber-300/30" />
                <StatusChip label="Planned" n={counts.planned ?? 0} cls="bg-white/10 text-white ring-white/20" />
                <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${mo.cls}`}>{mo.label}</span>
              </div>
            </div>
            <div className="hidden sm:block"><ProgressRing pct={pct} size={60} stroke={5} /></div>
          </div>
        </div>

        {/* Your next step */}
        <div className={'flex items-start gap-3 px-5 py-3.5 ' + (next.severity === 'urgent' ? 'bg-rose-50/70' : 'bg-teal-50/50')}>
          <span className={'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ' + (next.severity === 'urgent' ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-700')}>
            {next.severity === 'urgent' ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Your next step</p>
            <p className="text-sm font-bold text-navy-900">{next.label}</p>
            <p className="text-xs text-slate-600">{next.reason}</p>
          </div>
        </div>
      </section>

      {/* Name, goals & actions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">Your name (on the report)</span>
            <input type="text" value={owner} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Jordan Smith"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-700">My goals (what I&rsquo;m working toward)</span>
            <input type="text" value={goals} onChange={(e) => setPlanGoals(e.target.value)} placeholder="e.g. Find stable work + housing within 90 days"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowShare(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
            <Share2 className="h-4 w-4" /> Share with my caseworker
          </button>
          <button type="button" onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-700">
            <FileDown className="h-4 w-4" /> Import a plan
          </button>
          <button type="button" onClick={() => printPlan(owner, goals, items, checkins)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700">
            <Printer className="h-4 w-4" /> Print report
          </button>
          <button type="button" onClick={() => { if (confirm('Clear your whole plan?')) clearChecklist(); }} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700">
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>
      </section>

      {/* Needs attention */}
      {(overdue.length > 0 || soon.length > 0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-card">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Flame className="h-4 w-4 text-amber-600" /> Needs your attention</h3>
          <ul className="mt-2 space-y-1.5">
            {overdue.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-xs"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" /><span className="font-semibold text-navy-900">{i.name}</span><span className="text-rose-700">overdue · {fmtPlanDate(i.targetDate)}</span></li>
            ))}
            {soon.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-xs"><CalendarClock className="h-3.5 w-3.5 shrink-0 text-amber-600" /><span className="font-semibold text-navy-900">{i.name}</span><span className="text-amber-700">due {fmtPlanDate(i.targetDate)}</span></li>
            ))}
          </ul>
        </section>
      )}

      {/* Weekly check-in */}
      <CheckinCard checkins={checkins} />

      <ul className="grid gap-3">
        {items.map((it) => <ChecklistRow key={it.id} item={it} overdue={overdue.some((o) => o.id === it.id)} />)}
      </ul>
    </div>
  );
}

function StatusChip({ label, n, cls }: { label: string; n: number; cls: string }) {
  return <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${cls}`}>{n} {label}</span>;
}

function CheckinCard({ checkins }: { checkins: CheckIn[] }) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const log = () => {
    if (!rating && !note.trim()) return;
    addCheckin({ date: todayIso(), rating: rating || 3, note: note.trim() });
    setRating(0); setNote('');
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900"><HeartPulse className="h-4 w-4 text-teal-600" /> Weekly check-in</h3>
      <p className="mt-0.5 text-xs text-slate-500">How did this week go? A quick note keeps you honest and shows effort over time.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((r) => (
            <button key={r} type="button" onClick={() => setRating(r)} aria-label={`${r} out of 5`}
              className={'h-7 w-7 rounded-full text-xs font-bold transition ' + (rating >= r ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200')}>
              {r}
            </button>
          ))}
        </div>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') log(); }}
          placeholder="What went well? What was hard?"
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
        <button type="button" onClick={log} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700">Log check-in</button>
      </div>
      {checkins.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {checkins.slice(0, 4).map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 font-bold text-teal-700">{c.rating}</span>
              <span className="flex-1 text-slate-600">{c.note || <span className="text-slate-400">No note</span>}</span>
              <span className="shrink-0 text-slate-400">{fmtPlanDate(c.date)}</span>
              <button onClick={() => removeCheckin(c.id)} className="shrink-0 text-slate-300 hover:text-rose-500" aria-label="Remove check-in"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChecklistRow({ item, overdue = false }: { item: ChecklistItem; overdue?: boolean }) {
  const cleanPhone = (item.phone ?? '').replace(/[^\d]/g, '');
  const done = item.status === 'completed';
  return (
    <li className={'rounded-2xl border bg-white p-4 shadow-card sm:p-5 ' + (overdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <button
            type="button"
            onClick={() => setChecklistStatus(item.id, done ? 'planned' : 'completed')}
            aria-label={done ? 'Mark not done' : 'Mark done'}
            className={
              'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ' +
              (done ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-teal-400 hover:text-teal-300')
            }
          >
            <Check className="h-3 w-3" />
          </button>
          <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={'text-base font-semibold text-navy-900 ' + (done ? 'line-through opacity-60' : '')}>{item.name}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {item.type}{item.category ? ` · ${item.category}` : ''}
            </span>
            {overdue && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Overdue</span>}
          </div>
          {(item.address || item.cityState) && (
            <p className="mt-1 text-sm text-slate-600">
              {[item.address, item.cityState].filter(Boolean).join(', ')}{item.distance ? ` · ${item.distance} mi` : ''}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {cleanPhone && (
              <a href={`tel:${cleanPhone}`} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                <Phone className="h-3 w-3" /> {item.phone}
              </a>
            )}
            {item.url && (
              <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
          </div>
        </div>
        </div>
        <button
          type="button"
          onClick={() => removeFromChecklist(item.id)}
          aria-label="Remove from plan"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Where are you in the process? */}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Where are you with this?</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setChecklistStatus(item.id, s)}
              className={
                'rounded-full px-2.5 py-1 text-xs font-semibold transition ' +
                (item.status === s ? STATUS_META[s].cls : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50')
              }
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Plan details an officer would want */}
      <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr]">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">Target / appointment date</span>
          <input
            type="date"
            value={item.targetDate ?? ''}
            onChange={(e) => setChecklistTargetDate(item.id, e.target.value)}
            className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">Plan / next step / outcome</span>
          <input
            type="text"
            value={item.notes ?? ''}
            onChange={(e) => setChecklistNotes(item.id, e.target.value)}
            placeholder="e.g. Called 3/10, intake booked 3/14 2pm — bring ID & résumé"
            className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </label>
      </div>
    </li>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ' +
        (active
          ? 'bg-teal-600 text-white shadow-sm'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50')
      }
    >
      {children}
    </button>
  );
}

function AjcResults({ location, radius }: { location: string; radius: number }) {
  const [data, setData] = useState<AjcCentersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(null);
    getAjcCenters(location, radius)
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location, radius]);

  if (loading) return <ListSkeleton />;
  if (error)   return <ErrorPanel message={error} />;

  const centers = data?.OneStopCenterList ?? [];
  if (centers.length === 0) {
    return (
      <OfficialFinderPanel
        message={data?.meta?.message ?? 'No American Job Centers in that area — try widening the radius or a nearby city.'}
        finderUrl={data?.meta?.finderUrl}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {centers.map((c) => <AjcCard key={c.ID} center={c} />)}
    </ul>
  );
}

function OfficialFinderPanel({ message, finderUrl }: { message: string; finderUrl?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Building2 className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-navy-900">Find a center near you</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{message}</p>
      {finderUrl && (
        <a
          href={finderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <Globe className="h-4 w-4" /> Official DOL center finder <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function ReentryResults({ location, radius }: { location: string; radius: number }) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(null);
    getReentryPrograms(location, radius)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location, radius]);

  if (loading) return <ListSkeleton />;
  if (error)   return <ErrorPanel message={error} />;

  // CareerOneStop returns either an array of records OR a single-element
  // array with `Error` describing "no matches".
  const list = Array.isArray(data) ? data : [];
  const isEmpty = list.length === 0 || (list[0] && typeof list[0] === 'object' && 'Error' in list[0]);
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <SearchIcon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-navy-900">No programs found in that area</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Try a wider radius or a state code (e.g. <code className="rounded bg-slate-100 px-1">OH</code>). The reentry-program
          finder includes a smaller set of records than the full AJC directory — many areas
          have AJCs but no specifically-tagged reentry programs.
        </p>
        <p className="mx-auto mt-3 max-w-md text-xs text-slate-500">
          Most American Job Centers can refer you to local reentry partners even if they
          aren't listed here. Switch to the <strong>American Job Centers</strong> tab and call your closest one.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {(list as Array<Record<string, unknown>>).map((p, i) => (
        <ReentryCard key={String(p.Id ?? p.ID ?? i)} program={p} />
      ))}
    </ul>
  );
}

function AjcCard({ center }: { center: AjcCenter }) {
  const cleanPhone = (center.Phone ?? '').replace(/[^\d]/g, '');
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-700">
            <Building2 className="h-3 w-3" /> {center.ProgramType ?? 'Job Center'}
          </div>
          <h3 className="mt-2 text-base font-semibold text-navy-900">{center.Name}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
          {center.Distance} mi
        </span>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-700">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          {center.Address1}{center.Address2 ? `, ${center.Address2}` : ''}<br />
          {center.City}, {center.StateAbbr} {center.Zip}
        </span>
      </p>

      {center.OpenHour && (
        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-slate-600">
          <Clock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <span>{center.OpenHour}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {cleanPhone && (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <Phone className="h-3 w-3" /> {center.Phone}
          </a>
        )}
        {center.WebSiteUrl && (
          <a
            href={center.WebSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Globe className="h-3 w-3" /> Visit website <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {center.Latitude && center.Longitude && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${center.Latitude},${center.Longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Map className="h-3 w-3" /> Directions
          </a>
        )}
        <ChecklistToggle
          item={{
            id: `ajc-${center.ID}`,
            name: center.Name,
            type: 'Job center',
            address: [center.Address1, center.Address2].filter(Boolean).join(', '),
            cityState: [center.City, center.StateAbbr, center.Zip].filter(Boolean).join(', '),
            phone: center.Phone,
            url: center.WebSiteUrl,
            distance: center.Distance,
          }}
        />
      </div>
    </li>
  );
}

function ReentryCard({ program }: { program: Record<string, unknown> }) {
  // CareerOneStop's reentry shape varies — be defensive about field names.
  const name = String(program.Name ?? program.OrgName ?? program.ProgramName ?? 'Program');
  const desc = String(program.Description ?? program.About ?? '');
  const addr1 = String(program.Address1 ?? program.Address ?? '');
  const city = String(program.City ?? '');
  const state = String(program.StateAbbr ?? program.State ?? '');
  const zip = String(program.Zip ?? program.ZipCode ?? '');
  const phone = String(program.Phone ?? '');
  const url = String(program.Url ?? program.WebSiteUrl ?? program.Website ?? '');
  const services = (program.Services as string[] | undefined) ?? [];

  const cleanPhone = phone.replace(/[^\d]/g, '');
  const distance = String(program.Distance ?? '');
  const isNational = program.Scope === 'National';

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sunset-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sunset-700">
          <HeartHandshake className="h-3 w-3" /> {isNational ? 'National resource' : 'Reentry program'}
        </div>
        {!isNational && distance && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{distance} mi</span>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold text-navy-900">{name}</h3>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{desc}</p>}

      {(addr1 || city) && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-700">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            {addr1}<br />
            {[city, state, zip].filter(Boolean).join(', ')}
          </span>
        </p>
      )}

      {services.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {services.slice(0, 6).map((s, i) => (
            <span key={i} className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] text-teal-800">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {cleanPhone && (
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
          >
            <Phone className="h-3 w-3" /> {phone}
          </a>
        )}
        {url && (
          <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Globe className="h-3 w-3" /> Visit website <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <ChecklistToggle
          item={{
            id: `reentry-${String(program.ID ?? program.Id ?? name)}`,
            name,
            type: isNational ? 'Support service' : 'Reentry program',
            address: addr1 || undefined,
            cityState: [city, state, zip].filter(Boolean).join(', ') || undefined,
            phone: phone || undefined,
            url: url || undefined,
            distance: distance || undefined,
          }}
        />
      </div>
    </li>
  );
}

function ListSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-3/4" />
          <Skeleton className="mt-3 h-7 w-32 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Couldn't load resources</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <SearchIcon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm text-slate-700">{message}</p>
    </div>
  );
}
