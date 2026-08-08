'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { accountDisplayName, accountImageUrl } from '../../lib/account-identity';
import { Check, Gauge, Globe, HeartPulse, Phone, Trash2 } from 'lucide-react';
import {
  useChecklist, useOwnerName, usePlanGoals, toggleChecklist, removeFromChecklist,
  setChecklistStatus, setChecklistNotes, setChecklistTargetDate, setOwnerName, setPlanGoals,
  importChecklist, useCheckins, addCheckin, removeCheckin,
  type ChecklistItem, type ChecklistStatus, type CheckIn,
} from '../../lib/checklist-store';
import { PlanShareDialog } from './PlanShareDialog';
import { PlanImportDialog } from './PlanImportDialog';
import {
  checklistToPortable, portableToChecklist, type PortablePlan,
} from '../../lib/plan-transfer';
import {
  useReadiness, setReadinessAnswer, useSupervisionInfo, setSupervisionInfo,
  useConditions, addCondition, updateCondition, removeCondition, setConditions,
  useFees, addFee, updateFee, removeFee, setFees,
} from '../../lib/checklist-store';
import { buildSupervisionSummary, printSupervisionSummary, advanceCondition, defaultConditionDue } from '../../lib/supervision';
import {
  assessReadiness, selfToReadinessInput, BAND_LABEL,
  type ReadinessDomainKey, type DomainStatus, type DomainResult,
} from '../../lib/readiness';
import { ReadinessPanel } from '../readiness/ReadinessPanel';
import { PlanWorkspace } from './PlanWorkspace';
import { deriveStepDomain, type PlanModel, type PlanActions, type PlanStep } from '../../lib/plan-model';
import { AUTH_ENABLED } from '../../lib/auth-config';

/**
 * "My Plan" — the person's full plan workspace: steps, readiness, supervision
 * (conditions & fees), weekly check-ins, and the share / import / print flows
 * for handing progress to a caseworker or officer.
 *
 * Moved verbatim from the old `checklist` tab of app/local-help/page.tsx;
 * rendered at /plan. Everything lives in the on-device checklist store —
 * nothing leaves the browser unless the person shares it.
 */

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

function printPlan(
  owner: string, goals: string, items: ChecklistItem[], checkins: CheckIn[] = [],
  readiness?: { score: number; band: string; gaps: string[] },
) {
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
  const rdHtml = readiness ? `<div class="block"><div class="lbl">Readiness — ${readiness.score}% · ${esc(readiness.band)}</div>${readiness.gaps.length ? `<ul>${readiness.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : '<p>All assessed areas are ready.</p>'}</div>` : '';
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
    ${rdHtml}${winsHtml}${upHtml}
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

function readinessCatFromChecklist(c?: string): string | undefined {
  const v = (c || '').toLowerCase();
  if (/hous|shelter/.test(v)) return 'housing';
  if (/transport|transit/.test(v)) return 'transit';
  if (/food/.test(v)) return 'food';
  if (/health|recov|treatment/.test(v)) return 'health';
  if (/legal|record|\bid\b|document/.test(v)) return 'legal';
  if (/child|family/.test(v)) return 'family';
  if (/train|educ|skill/.test(v)) return 'training';
  if (/job|employ/.test(v)) return 'employment';
  return undefined;
}

function ReadinessView() {
  const items = useChecklist();
  const goals = usePlanGoals();
  const answers = useReadiness();

  const completedCategories = items
    .filter((i) => i.status === 'completed')
    .map((i) => readinessCatFromChecklist(i.category))
    .filter((c): c is string => Boolean(c));

  const result = assessReadiness(selfToReadinessInput({ careerGoal: goals, completedCategories }), answers);
  const addedGapKeys = new Set(items.map((i) => i.id));

  const onAddGap = (g: DomainResult) => {
    if (!g.gap) return;
    if (items.some((i) => i.id === `readiness:${g.key}`)) return;
    toggleChecklist({ id: `readiness:${g.key}`, name: g.gap.taskTitle, type: 'Readiness step', category: g.label, url: g.gap.url });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
        <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        <span>See where you stand across what employers and programs look for. Mark each area, and add what&rsquo;s missing to your plan — then share your progress with a caseworker.</span>
      </div>
      <ReadinessPanel
        result={result}
        onSetStatus={(d: ReadinessDomainKey, s: DomainStatus) => setReadinessAnswer(d, s)}
        onAddGap={onAddGap}
        addedGapKeys={addedGapKeys}
      />
    </div>
  );
}

const MOMENTUM_META = {
  rising: { label: 'Rising', cls: 'bg-teal-50 text-teal-700 ring-teal-200' },
  steady: { label: 'Steady', cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
  stalled: { label: 'Let’s get moving', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
} as const;

type AccountIdentity = { displayName: string; imageUrl?: string };

export function MyPlan() {
  return AUTH_ENABLED ? <AccountPlan /> : <PlanContent />;
}

function AccountPlan() {
  const { isLoaded, user } = useUser();
  const identity = isLoaded && user ? { displayName: accountDisplayName(user), imageUrl: accountImageUrl(user) } : undefined;
  return <PlanContent identity={identity} />;
}

function PlanContent({ identity }: { identity?: AccountIdentity }) {
  const items = useChecklist();
  const owner = useOwnerName();
  const goals = usePlanGoals();
  const checkins = useCheckins();
  const rdAnswers = useReadiness();
  const supervision = useSupervisionInfo();
  const conditionList = useConditions();
  const feeList = useFees();
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const rdCompleted = items.filter((i) => i.status === 'completed')
    .map((i) => readinessCatFromChecklist(i.category)).filter((c): c is string => Boolean(c));
  const readiness = assessReadiness(selfToReadinessInput({ careerGoal: goals, completedCategories: rdCompleted }), rdAnswers);
  const rdSummary = { score: readiness.score, band: BAND_LABEL[readiness.band], gaps: readiness.gaps.slice(0, 5).map((g) => g.gap?.label ?? g.label) };

  const handleImport = (plan: PortablePlan, mode: 'replace' | 'merge') => {
    importChecklist(portableToChecklist(plan), mode);
    if (plan.readiness) {
      for (const [d, s] of Object.entries(plan.readiness)) {
        if (s) setReadinessAnswer(d as ReadinessDomainKey, s as DomainStatus);
      }
    }
    if (plan.supervision) setSupervisionInfo(plan.supervision);
    if (plan.conditions) setConditions(plan.conditions);
    if (plan.fees) setFees(plan.fees);
    setShowImport(false);
  };

  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  const reportName = owner.trim() || identity?.displayName || '';
  const model: PlanModel = {
    ownerName: owner, ownerIdentity: identity, goals, readiness, isCaseworker: false, checkins, supervision, conditions: conditionList, fees: feeList,
    steps: items.map((i): PlanStep => ({
      id: i.id, title: i.name, status: i.status,
      domain: i.domain ?? deriveStepDomain({ id: i.id, category: i.category, type: i.type, notes: i.notes }),
      dueDate: i.targetDate, notes: i.notes, url: i.url, source: 'manual',
    })),
  };

  const actions: PlanActions = {
    setDomainStatus: (d, s) => setReadinessAnswer(d, s),
    addGapStep: (g) => { if (!g.gap) return; toggleChecklist({ id: `readiness:${g.key}`, name: g.gap.taskTitle, type: 'Readiness step', category: g.label, url: g.gap.url, domain: g.key }); },
    addStep: (domain, title) => { toggleChecklist({ id: `step_${Math.random().toString(36).slice(2, 9)}`, name: title, type: 'Step', category: domain, domain }); },
    setStepStatus: (id, s) => setChecklistStatus(id, s),
    setStepDue: (id, d) => setChecklistTargetDate(id, d),
    setStepNotes: (id, n) => setChecklistNotes(id, n),
    removeStep: (id) => removeFromChecklist(id),
    setOwnerName: (v) => setOwnerName(v),
    setGoals: (v) => setPlanGoals(v),
    addCheckin: (rating, note) => addCheckin({ date: todayIso(), rating, note }),
    removeCheckin: (id) => removeCheckin(id),
    setSupervision: (patch) => setSupervisionInfo(patch),
    addCondition: (c) => addCondition({ id: `cond_${Math.random().toString(36).slice(2, 9)}`, type: c.type, label: c.label, cadence: c.cadence, dueDate: c.dueDate ?? defaultConditionDue(c.cadence), createdAt: Date.now() }),
    markConditionMet: (id) => { const c = conditionList.find((x) => x.id === id); if (c) updateCondition(id, advanceCondition(c)); },
    setConditionDue: (id, d) => updateCondition(id, { dueDate: d || undefined }),
    removeCondition: (id) => removeCondition(id),
    addFee: (f) => addFee({ id: `fee_${Math.random().toString(36).slice(2, 9)}`, kind: f.kind, label: f.label, total: f.total, dueDate: f.dueDate, payments: [], createdAt: Date.now() }),
    logPayment: (feeId, amount, date, note) => { const o = feeList.find((x) => x.id === feeId); if (o) updateFee(feeId, { payments: [...(o.payments ?? []), { id: `pay_${Math.random().toString(36).slice(2, 9)}`, amount, date, note }] }); },
    removePayment: (feeId, paymentId) => { const o = feeList.find((x) => x.id === feeId); if (o) updateFee(feeId, { payments: (o.payments ?? []).filter((p) => p.id !== paymentId) }); },
    setFeeDue: (feeId, d) => updateFee(feeId, { dueDate: d || undefined }),
    setFeeTotal: (feeId, total) => updateFee(feeId, { total }),
    removeFee: (feeId) => removeFee(feeId),
    onSupervisionSummary: () => printSupervisionSummary(buildSupervisionSummary(model, supervision)),
    onShare: () => setShowShare(true),
    onImport: () => setShowImport(true),
    onPrint: () => printPlan(reportName, goals, items, checkins, rdSummary),
  };

  return (
    <div className="space-y-4">
      {showShare && (
        <PlanShareDialog plan={checklistToPortable(items, reportName, goals, rdAnswers, supervision, conditionList, feeList)} audience="caseworker" onClose={() => setShowShare(false)} />
      )}
      {showImport && (
        <PlanImportDialog title="Import a plan" hint="Paste a code or upload a file your caseworker shared with you." allowMerge onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
      <PlanWorkspace model={model} actions={actions} />
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
