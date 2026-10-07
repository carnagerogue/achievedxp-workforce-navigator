'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { FileDown, LockKeyhole, Printer, Share2 } from 'lucide-react';
import { accountDisplayName, accountImageUrl } from '../../lib/account-identity';
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
  type ReadinessDomainKey, type DomainStatus,
} from '../../lib/readiness';
import { PlanWorkspace } from './PlanWorkspace';
import { Roadmap } from './Roadmap';
import { deriveStepDomain, type PlanModel, type PlanActions, type PlanStep } from '../../lib/plan-model';
import { AUTH_ENABLED } from '../../lib/auth-config';
import { useLocalProfile } from '../../lib/local-profile';
import { useFutureSelf, setFutureSelf, useReentryInputs } from '../../lib/reentry-store';
import { useContacts } from '../../lib/support-network';
import { CornerSection, EvidencePanel } from '../journey/CompassSections';
import { CalendarExportButton } from '../CalendarExportButton';
import { PageHeader } from '../shell/PageHeader';

/**
 * "My plan" — everything about getting from here to steady, better-paying
 * work, in one place and in priority order: what you're working toward, the
 * roadmap, your own steps and dates, supervision requirements when they
 * apply, your weekly check-in, and the people in your corner. Share / import
 * / print hand progress to a caseworker or officer.
 *
 * Everything lives in the on-device stores — nothing leaves the browser
 * unless the person shares it.
 */

const STATUS_META: Record<ChecklistStatus, { label: string; cls: string; mark: string }> = {
  planned:   { label: 'Planned',   cls: 'bg-slate-100 text-slate-700', mark: '☐' },
  contacted: { label: 'Contacted', cls: 'bg-amber-100 text-amber-800', mark: '◔' },
  scheduled: { label: 'Scheduled', cls: 'bg-sky-100 text-sky-800',     mark: '◑' },
  completed: { label: 'Completed', cls: 'bg-teal-100 text-teal-800',   mark: '☑' },
};

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
  const futureSelf = useFutureSelf();
  const checkins = useCheckins();
  const rdAnswers = useReadiness();
  const supervision = useSupervisionInfo();
  const conditionList = useConditions();
  const feeList = useFees();
  const contacts = useContacts();
  const reentryInputs = useReentryInputs();
  const profile = useLocalProfile();
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Without accounts, the name from setup is the identity on shared reports.
  const ownerIdentity: AccountIdentity | undefined = identity
    ?? (profile?.displayName?.trim() ? { displayName: profile.displayName.trim() } : undefined);
  const onSupervision = profile?.onParoleOrProbation === true || reentryInputs.onSupervision === true;

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

  const reportName = owner.trim() || ownerIdentity?.displayName || '';
  const firstName = reportName.split(/\s+/)[0] || '';
  const model: PlanModel = {
    ownerName: owner, ownerIdentity, goals, readiness, isCaseworker: false, checkins, supervision, conditions: conditionList, fees: feeList,
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
    <div className="space-y-6 sm:space-y-8">
      {showShare && (
        <PlanShareDialog plan={checklistToPortable(items, reportName, goals, rdAnswers, supervision, conditionList, feeList)} audience="caseworker" onClose={() => setShowShare(false)} />
      )}
      {showImport && (
        <PlanImportDialog title="Import a plan" hint="Paste a code or upload a file your caseworker shared with you." allowMerge onImport={handleImport} onClose={() => setShowImport(false)} />
      )}

      <PageHeader
        eyebrow="My plan"
        title={firstName ? `${firstName}’s plan` : 'Your plan'}
        description="Everything between where you are now and steady, better-paying work — in a sensible order. Check things off as you go."
        actions={(
          <>
            <ToolbarButton onClick={() => setShowShare(true)} Icon={Share2} label="Share" />
            <ToolbarButton onClick={() => printPlan(reportName, goals, items, checkins, rdSummary)} Icon={Printer} label="Print" />
            <ToolbarButton onClick={() => setShowImport(true)} Icon={FileDown} label="Import" />
          </>
        )}
      />

      <GoalCard
        goal={goals || futureSelf}
        onGoal={(v) => { setPlanGoals(v); setFutureSelf(v); }}
        owner={owner}
        onOwner={setOwnerName}
        identityName={ownerIdentity?.displayName}
      />

      <Roadmap />

      <PlanWorkspace
        model={model}
        actions={actions}
        hideHeader
        hideGoal
        supervisionDefaultOpen={onSupervision}
        stepsHeading={{
          title: 'Your steps',
          description: 'Things you’re doing outside the roadmap — appointments, classes, applications. Add a date and we’ll remind you on Home.',
        }}
      />

      <CornerSection contacts={contacts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> Private on this device. Share or print a copy when you choose.</p>
        <CalendarExportButton />
      </div>

      <EvidencePanel />
    </div>
  );
}

function ToolbarButton({ onClick, Icon, label }: { onClick: () => void; Icon: typeof Share2; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-navy-900">
      <Icon className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );
}

/** One sentence about where this is all heading — shown on Home as "Working toward". */
function GoalCard({ goal, onGoal, owner, onOwner, identityName }: {
  goal: string;
  onGoal: (v: string) => void;
  owner: string;
  onOwner: (v: string) => void;
  identityName?: string;
}) {
  return (
    <section id="goal" aria-labelledby="goal-heading" className="scroll-mt-32 rounded-[20px] border border-slate-900/[0.08] bg-white p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <label className="block">
          <span id="goal-heading" className="block text-lg font-semibold text-navy-900">What are you working toward?</span>
          <span className="mt-0.5 block text-sm text-slate-500">One sentence is enough. You can change it any time.</span>
          <input value={goal} onChange={(e) => onGoal(e.target.value)}
            placeholder="e.g. A steady job with benefits so I can support my family"
            className="mt-3 block h-12 w-full rounded-xl border border-slate-300 px-4 text-[15px] text-navy-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
        </label>
        <label className="block lg:pt-[3.25rem]">
          <span className="block text-sm font-medium text-slate-700">Name on plans you share</span>
          <input value={owner} onChange={(e) => onOwner(e.target.value)} placeholder={identityName || 'Your name'}
            className="mt-1.5 block h-12 w-full rounded-xl border border-slate-300 px-4 text-[15px] text-navy-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          {!owner && identityName && <span className="mt-1 block text-xs text-slate-400">Using “{identityName}” from your profile</span>}
        </label>
      </div>
    </section>
  );
}
