'use client';

import { useState } from 'react';
import {
  FileText, Home, Bus, HeartPulse, Scale, GraduationCap, Award, Briefcase, Laptop, Wallet,
  Users, ListChecks, Check, Trash2, Plus, ExternalLink, Sparkles, AlertTriangle, ChevronDown,
  Share2, FileDown, Printer, HeartHandshake, ShieldCheck, ScrollText, CalendarClock,
} from 'lucide-react';
import {
  reportDueState, conditionStatus, complianceFromConditions, CONDITION_TEMPLATES, CADENCE_LABEL,
  feePaid, feeBalance, feePct, feeIsBehind, feeAmountSet, feesTotals, fmtMoney, FEE_TEMPLATES, FEE_KIND_LABEL,
  type ConditionStatus, type ConditionCadence, type ConditionType, type SupervisionCondition,
  type FeeObligation, type FeeKind,
} from '../../lib/supervision';
import { ProgressRing } from '../common/ProgressRing';
import { Avatar } from '../common/Avatar';
import {
  READINESS_DOMAINS, BAND_LABEL,
  type ReadinessDomainKey, type DomainStatus, type DomainResult,
} from '../../lib/readiness';
import {
  PLAN_BUCKETS, stepDomainCounts,
  type PlanModel, type PlanActions, type PlanStep, type PlanDomain, type PlanStepStatus,
} from '../../lib/plan-model';

const DOMAIN_ICON: Record<string, typeof Home> = {
  id_documents: FileText, housing: Home, transportation: Bus, health_recovery: HeartPulse,
  legal_compliance: Scale, education: GraduationCap, credentials_skills: Award,
  work_readiness: Briefcase, digital_literacy: Laptop, finances: Wallet, support_network: Users,
  jobs: Briefcase, general: ListChecks,
};

const D_STATUS: { value: DomainStatus; label: string }[] = [
  { value: 'not_ready', label: 'Not ready' }, { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' }, { value: 'na', label: 'Not assessed / N/A' },
];
const D_STATUS_CLS: Record<DomainStatus, string> = {
  not_ready: 'border-rose-300 bg-rose-50 text-rose-700',
  in_progress: 'border-amber-300 bg-amber-50 text-amber-700',
  ready: 'border-teal-400 bg-teal-50 text-teal-700',
  na: 'border-slate-300 bg-slate-50 text-slate-500',
};
const STATUS_RANK: Record<DomainStatus, number> = { not_ready: 0, in_progress: 1, ready: 3, na: 4 };

const S_STATUS: PlanStepStatus[] = ['planned', 'contacted', 'scheduled', 'completed'];
const S_STATUS_LABEL: Record<PlanStepStatus, string> = { planned: 'Planned', contacted: 'Contacted', scheduled: 'Scheduled', completed: 'Completed' };
const S_STATUS_CLS: Record<PlanStepStatus, string> = {
  planned: 'border-slate-300 bg-slate-50 text-slate-600',
  contacted: 'border-sky-300 bg-sky-50 text-sky-700',
  scheduled: 'border-violet-300 bg-violet-50 text-violet-700',
  completed: 'border-teal-400 bg-teal-50 text-teal-700',
};

export function PlanWorkspace({ model, actions }: { model: PlanModel; actions: PlanActions }) {
  const { readiness, steps } = model;
  const domainResultByKey = new Map(readiness.domains.map((d) => [d.key, d]));
  const stepsByDomain = (d: PlanDomain) => steps.filter((s) => s.domain === d);
  const counts = stepDomainCounts(steps);
  const openSteps = steps.filter((s) => s.status !== 'completed').length;
  const readyCount = readiness.domains.filter((d) => d.status === 'ready').length;
  const applicable = readiness.domains.filter((d) => d.status !== 'na').length;
  const planPct = steps.length ? Math.round((steps.filter((s) => s.status === 'completed').length / steps.length) * 100) : 0;
  const topGap = readiness.gaps[0];

  // Domains sorted by attention; N/A with no steps hidden.
  const domains = [...READINESS_DOMAINS]
    .map((d) => ({ def: d, res: domainResultByKey.get(d.key)!, steps: stepsByDomain(d.key) }))
    .filter((d) => d.res && !(d.res.status === 'na' && d.steps.length === 0))
    .sort((a, b) => STATUS_RANK[a.res.status] - STATUS_RANK[b.res.status]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 px-5 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_90%_-20%,rgba(45,212,229,0.25),transparent)]" />
          <div className="relative flex items-center gap-4">
            <Avatar name={model.ownerName || 'You'} size={52} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white">{model.ownerName ? `${model.ownerName}’s plan` : 'My plan'}</h2>
              <p className="mt-0.5 text-xs text-teal-50/80">{applicable === 0 ? 'Readiness not assessed' : `${BAND_LABEL[readiness.band]} · ${readyCount}/${applicable} areas ready`} · {openSteps} open step{openSteps === 1 ? '' : 's'}</p>
            </div>
            {applicable > 0 && <div className="hidden sm:block text-center">
              <ProgressRing pct={readiness.score} size={58} stroke={5} />
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-teal-100/70">Readiness</p>
            </div>}
          </div>
          {(actions.onShare || actions.onImport || actions.onPrint) && (
            <div className="relative mt-4 flex flex-wrap gap-2">
              {actions.onShare && <HdrBtn onClick={actions.onShare} Icon={Share2} label={model.isCaseworker ? 'Give to participant' : 'Share'} />}
              {actions.onImport && <HdrBtn onClick={actions.onImport} Icon={FileDown} label="Import" />}
              {actions.onSupervisionSummary && <HdrBtn onClick={actions.onSupervisionSummary} Icon={ScrollText} label="Supervision summary" />}
              {actions.onPrint && <HdrBtn onClick={actions.onPrint} Icon={Printer} label="Print" primary />}
            </div>
          )}
        </div>

        {/* Focus / next best action */}
        {topGap && (
          <div className="flex items-start gap-3 bg-amber-50/50 px-5 py-3.5">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Sparkles className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Focus next</p>
              <p className="text-sm font-bold text-navy-900">{topGap.gap?.label ?? topGap.label}</p>
              <p className="text-xs text-slate-600">{topGap.label} — {topGap.whatReady}</p>
            </div>
          </div>
        )}
      </section>

      {/* Name + goals (individual only) */}
      {(actions.setOwnerName || actions.setGoals) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.setOwnerName && (
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-slate-700">Your name (on the report)</span>
                <input value={model.ownerName} onChange={(e) => actions.setOwnerName!(e.target.value)} placeholder="e.g. Jordan Smith"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" /></label>
            )}
            {actions.setGoals && (
              <label className="text-sm"><span className="mb-1 block text-xs font-medium text-slate-700">My goal</span>
                <input value={model.goals} onChange={(e) => actions.setGoals!(e.target.value)} placeholder="e.g. Stable work + housing in 90 days"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" /></label>
            )}
          </div>
        </section>
      )}

      {/* Supervision */}
      {model.supervision && actions.setSupervision && (
        <SupervisionCard model={model} actions={actions} />
      )}

      {/* Domain sections */}
      {domains.map(({ def, res, steps: dSteps }) => (
        <DomainCard key={def.key} domainKey={def.key} label={def.label} whatReady={def.whatReady}
          res={res} steps={dSteps} actions={actions} />
      ))}

      {/* Buckets: jobs & general */}
      {PLAN_BUCKETS.map((b) => {
        const bSteps = stepsByDomain(b.key);
        if (bSteps.length === 0 && b.key === 'general') return null;
        return <BucketCard key={b.key} domain={b.key} label={b.label} whatReady={b.whatReady} steps={bSteps} actions={actions} />;
      })}

      {/* Weekly check-in (individual) */}
      {model.checkins && actions.addCheckin && (
        <CheckinCard checkins={model.checkins} onAdd={actions.addCheckin} onRemove={actions.removeCheckin} />
      )}

      <p className="text-center text-[11px] text-slate-400">
        {model.isCaseworker ? 'Saved only in this browser.' : 'Saved only in this browser — export or share a copy when you choose.'}
      </p>
    </div>
  );
}

function HdrBtn({ onClick, Icon, label, primary }: { onClick: () => void; Icon: typeof Share2; label: string; primary?: boolean }) {
  return (
    <button onClick={onClick} className={
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ' +
      (primary ? 'bg-white/95 text-navy-900 hover:bg-white' : 'border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20')
    }><Icon className="h-3.5 w-3.5" /> {label}</button>
  );
}

function SupervisionCard({ model, actions }: { model: PlanModel; actions: PlanActions }) {
  const sup = model.supervision ?? {};
  const due = reportDueState(sup.nextReportDate);
  const dueCls = due === 'overdue' ? 'border-rose-200 bg-rose-50 text-rose-700'
    : due === 'due_soon' ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-teal-200 bg-teal-50 text-teal-700';
  const dueMsg = due === 'overdue' ? `Report to your officer was due ${sup.nextReportDate}`
    : due === 'due_soon' ? `Report to your officer by ${sup.nextReportDate}`
    : `Next report to your officer: ${sup.nextReportDate}`;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900"><ShieldCheck className="h-4 w-4 text-teal-600" /> Supervision</h3>
        {actions.onSupervisionSummary && (
          <button onClick={actions.onSupervisionSummary} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"><ScrollText className="h-3.5 w-3.5" /> Supervision summary</button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-slate-500">Stay ahead of check-ins and prove your effort — generate a clean summary for your officer anytime.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm"><span className="mb-1 block text-xs font-medium text-slate-700">Officer name</span>
          <input value={sup.officerName ?? ''} onChange={(e) => actions.setSupervision!({ officerName: e.target.value })} placeholder="e.g. Officer Lee"
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" /></label>
        <label className="text-sm"><span className="mb-1 block text-xs font-medium text-slate-700">Supervision type</span>
          <select value={sup.supervisionType ?? 'none'} onChange={(e) => actions.setSupervision!({ supervisionType: e.target.value as 'parole' | 'probation' | 'none' })}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500">
            <option value="none">None</option><option value="parole">Parole</option><option value="probation">Probation</option>
          </select></label>
        <label className="text-sm"><span className="mb-1 block text-xs font-medium text-slate-700">Next report date</span>
          <input type="date" value={sup.nextReportDate ?? ''} onChange={(e) => actions.setSupervision!({ nextReportDate: e.target.value || undefined })}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" /></label>
      </div>
      {due !== 'none' && (
        <p className={'mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ' + dueCls}><CalendarClock className="h-3.5 w-3.5" /> {dueMsg}</p>
      )}
      {actions.addCondition && <ConditionsBlock conditions={model.conditions ?? []} actions={actions} />}
      {actions.addFee && <FeesBlock fees={model.fees ?? []} actions={actions} />}
    </section>
  );
}

const COND_PILL: Record<ConditionStatus, string> = {
  met: 'bg-teal-50 text-teal-700 ring-teal-200',
  due_soon: 'bg-amber-50 text-amber-700 ring-amber-200',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  pending: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const COND_PILL_LABEL: Record<ConditionStatus, string> = { met: 'Met', due_soon: 'Due soon', overdue: 'Overdue', pending: 'In place' };

function ConditionsBlock({ conditions, actions }: { conditions: SupervisionCondition[]; actions: PlanActions }) {
  const list = conditions ?? [];
  const comp = complianceFromConditions(list);
  const compCls = comp.tone === 'at_risk' ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : comp.tone === 'attention' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-teal-50 text-teal-700 ring-teal-200';
  const haveLabels = new Set(list.map((c) => c.label.toLowerCase()));
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ConditionType>('other');
  const [cadence, setCadence] = useState<ConditionCadence>('monthly');

  const addCustom = () => { const t = label.trim(); if (!t) return; actions.addCondition!({ type, label: t, cadence }); setLabel(''); setType('other'); setCadence('monthly'); setAdding(false); };

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><ListChecks className="h-3.5 w-3.5" /> Conditions &amp; check-ins</h4>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${compCls}`}>
          {comp.tone === 'at_risk' && <AlertTriangle className="h-3 w-3" />} {comp.label}{comp.overdue ? ` · ${comp.overdue} overdue` : comp.dueSoon ? ` · ${comp.dueSoon} due soon` : ''}
        </span>
      </div>

      {list.length > 0 && (
        <ul className="mt-2 space-y-1.5">{list.map((c) => <ConditionRow key={c.id} c={c} actions={actions} />)}</ul>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {CONDITION_TEMPLATES.filter((t) => !haveLabels.has(t.label.toLowerCase())).slice(0, 6).map((t) => (
          <button key={t.label} onClick={() => actions.addCondition!({ type: t.type, label: t.label, cadence: t.cadence })}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700">
            <Plus className="h-3 w-3" /> {t.label}
          </button>
        ))}
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700"><Plus className="h-3 w-3" /> Custom</button>
        )}
      </div>

      {adding && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setAdding(false); }} placeholder="Condition…"
            className="min-w-[160px] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
          <select value={cadence} onChange={(e) => setCadence(e.target.value as ConditionCadence)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none">
            {(['once', 'weekly', 'biweekly', 'monthly', 'as_needed'] as ConditionCadence[]).map((c) => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}
          </select>
          <button onClick={addCustom} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Add</button>
          <button onClick={() => setAdding(false)} className="px-2 py-1.5 text-xs font-semibold text-slate-500">Cancel</button>
        </div>
      )}
    </div>
  );
}

function ConditionRow({ c, actions }: { c: SupervisionCondition; actions: PlanActions }) {
  const status = conditionStatus(c);
  const showDue = c.cadence !== 'as_needed';
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${COND_PILL[status]}`}>{COND_PILL_LABEL[status]}</span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-navy-900">{c.label} <span className="font-normal text-slate-400">· {CADENCE_LABEL[c.cadence]}</span></span>
      {showDue && (
        <input type="date" value={c.dueDate ?? ''} onChange={(e) => actions.setConditionDue!(c.id, e.target.value)} aria-label={`${c.label} due date`}
          className={'rounded-md border px-1.5 py-1 text-[11px] focus:border-teal-500 focus:outline-none ' + (status === 'overdue' ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-600')} />
      )}
      <button onClick={() => actions.markConditionMet!(c.id)} aria-label={`Mark ${c.label} met`} className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-700"><Check className="h-3 w-3" /> {c.cadence === 'once' ? 'Done' : 'Mark met'}</button>
      <button onClick={() => actions.removeCondition!(c.id)} className="text-slate-300 hover:text-rose-500" aria-label={`Remove condition: ${c.label}`}><Trash2 className="h-3.5 w-3.5" /></button>
    </li>
  );
}

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function FeesBlock({ fees, actions }: { fees: FeeObligation[]; actions: PlanActions }) {
  const list = fees ?? [];
  const totals = feesTotals(list);
  const haveLabels = new Set(list.map((o) => o.label.toLowerCase()));
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<FeeKind>('supervision_fee');
  const [total, setTotal] = useState('');

  const anyAmountSet = list.some(feeAmountSet);
  const balCls = totals.behind > 0 ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : totals.balance > 0 ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : list.length && !anyAmountSet ? 'bg-slate-100 text-slate-600 ring-slate-200'
    : 'bg-teal-50 text-teal-700 ring-teal-200';
  const balLabel = totals.behind > 0 ? `${fmtMoney(totals.balance)} owed · ${totals.behind} behind`
    : totals.balance > 0 ? `${fmtMoney(totals.balance)} balance`
    : list.length && !anyAmountSet ? 'Add amounts owed'
    : list.length ? 'Paid in full' : 'None tracked';

  const addTemplate = (k: FeeKind, lbl: string) => actions.addFee!({ kind: k, label: lbl, total: 0 });
  const addCustom = () => {
    const t = label.trim(); const amt = Math.max(0, Math.round(Number(total) || 0));
    if (!t) return;
    actions.addFee!({ kind, label: t, total: amt });
    setLabel(''); setTotal(''); setKind('supervision_fee'); setAdding(false);
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Wallet className="h-3.5 w-3.5" /> Fees &amp; restitution</h4>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${balCls}`}>
          {totals.behind > 0 && <AlertTriangle className="h-3 w-3" />} {balLabel}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Track what you owe and log each payment. This tool keeps the record — it never processes money.</p>

      {list.length > 0 && (
        <ul className="mt-2 space-y-1.5">{list.map((o) => <FeeRow key={o.id} o={o} actions={actions} />)}</ul>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {FEE_TEMPLATES.filter((t) => !haveLabels.has(t.label.toLowerCase())).map((t) => (
          <button key={t.label} onClick={() => addTemplate(t.kind, t.label)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700">
            <Plus className="h-3 w-3" /> {t.label}
          </button>
        ))}
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700"><Plus className="h-3 w-3" /> Custom</button>
        )}
      </div>

      {adding && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setAdding(false); }} placeholder="Obligation…"
            className="min-w-[150px] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
          <select value={kind} onChange={(e) => setKind(e.target.value as FeeKind)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none">
            {(Object.keys(FEE_KIND_LABEL) as FeeKind[]).map((k) => <option key={k} value={k}>{FEE_KIND_LABEL[k]}</option>)}
          </select>
          <div className="inline-flex items-center rounded-md border border-slate-300 bg-white pl-2">
            <span className="text-xs text-slate-400">$</span>
            <input type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }} placeholder="Total owed"
              className="w-24 rounded-md px-1.5 py-1.5 text-sm focus:outline-none" />
          </div>
          <button onClick={addCustom} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Add</button>
          <button onClick={() => setAdding(false)} className="px-2 py-1.5 text-xs font-semibold text-slate-500">Cancel</button>
        </div>
      )}
    </div>
  );
}

function FeeRow({ o, actions }: { o: FeeObligation; actions: PlanActions }) {
  const paid = feePaid(o);
  const balance = feeBalance(o);
  const pct = feePct(o);
  const behind = feeIsBehind(o);
  const amountSet = feeAmountSet(o);
  const settled = balance <= 0 && amountSet;
  const payments = [...(o.payments ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const [totalDraft, setTotalDraft] = useState(amountSet ? String(o.total) : '');
  const [editTotal, setEditTotal] = useState(false);

  const logPay = () => { const v = Math.round(Number(amt) || 0); if (v <= 0) return; actions.logPayment!(o.id, v, todayIso()); setAmt(''); };
  const saveTotal = () => { const v = Math.max(0, Math.round(Number(totalDraft) || 0)); actions.setFeeTotal?.(o.id, v); setEditTotal(false); };
  const barCls = settled ? 'bg-teal-500' : behind ? 'bg-rose-500' : 'bg-amber-500';

  return (
    <li className="rounded-xl border border-slate-200 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold text-navy-900">
          {o.label} <span className="font-normal text-slate-400">· {FEE_KIND_LABEL[o.kind]}</span>
          {behind && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200"><AlertTriangle className="h-2.5 w-2.5" /> Behind</span>}
          {settled && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 ring-1 ring-inset ring-teal-200"><Check className="h-2.5 w-2.5" /> Paid</span>}
        </span>
        {amountSet && !editTotal ? (
          <button onClick={() => { setTotalDraft(String(o.total)); setEditTotal(true); }} className="text-xs font-semibold text-navy-900 hover:text-teal-700" title="Edit amount owed">
            {fmtMoney(balance)} <span className="font-normal text-slate-400">left of {fmtMoney(o.total)}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-500">{amountSet ? 'Amount owed' : 'Set amount owed'}</span>
            <span className="inline-flex items-center rounded-md border border-slate-300 bg-white pl-2"><span className="text-xs text-slate-400">$</span>
              <input autoFocus type="number" min="0" value={totalDraft} onChange={(e) => setTotalDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveTotal(); if (e.key === 'Escape') setEditTotal(false); }} placeholder="Total"
                className="w-20 rounded-md px-1.5 py-1 text-xs focus:outline-none" /></span>
            <button onClick={saveTotal} className="rounded-md bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-700">Save</button>
          </span>
        )}
        <button onClick={() => actions.removeFee!(o.id)} className="text-slate-300 hover:text-rose-500" aria-label={`Remove obligation: ${o.label}`}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>

      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={'h-full rounded-full transition-all ' + barCls} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-md border border-slate-300 bg-white pl-2">
          <span className="text-xs text-slate-400">$</span>
          <input type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') logPay(); }} placeholder="Payment"
            className="w-20 rounded-md px-1.5 py-1 text-xs focus:outline-none" />
        </div>
        <button onClick={logPay} className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-700"><Plus className="h-3 w-3" /> Log payment</button>
        <input type="date" value={o.dueDate ?? ''} onChange={(e) => actions.setFeeDue!(o.id, e.target.value)} title="Next payment due" aria-label={`${o.label} next payment due`}
          className={'rounded-md border px-1.5 py-1 text-[11px] focus:border-teal-500 focus:outline-none ' + (behind ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-600')} />
        <span className="text-[11px] text-slate-400">{fmtMoney(paid)} paid</span>
        {payments.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600">
            {payments.length} payment{payments.length === 1 ? '' : 's'} <ChevronDown className={'h-3 w-3 transition ' + (open ? 'rotate-180' : '')} />
          </button>
        )}
      </div>

      {open && payments.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">{payments.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="font-semibold text-navy-900">{fmtMoney(p.amount)}</span>
            <span className="text-slate-400">{p.date}</span>
            {p.note && <span className="truncate">— {p.note}</span>}
            <button onClick={() => actions.removePayment!(o.id, p.id)} className="ml-auto text-slate-300 hover:text-rose-500" aria-label={`Remove ${fmtMoney(p.amount)} payment for ${o.label}`}><Trash2 className="h-3 w-3" /></button>
          </li>
        ))}</ul>
      )}
    </li>
  );
}

function DomainCard({
  domainKey, label, whatReady, res, steps, actions,
}: {
  domainKey: ReadinessDomainKey; label: string; whatReady: string; res: DomainResult; steps: PlanStep[]; actions: PlanActions;
}) {
  const Icon = DOMAIN_ICON[domainKey];
  const done = steps.filter((s) => s.status === 'completed').length;
  const allDone = steps.length > 0 && done === steps.length;
  const isGap = res.status !== 'ready' && res.status !== 'na';
  const hasGapStep = steps.some((s) => s.id.startsWith('readiness:' + domainKey)) || steps.length > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-navy-900">{label}</h3>
            {res.auto && res.status !== 'na' && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">auto</span>}
            {steps.length > 0 && <span className="text-[11px] text-slate-400">{done}/{steps.length} done</span>}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{whatReady}</p>
        </div>
        <select value={res.status} onChange={(e) => actions.setDomainStatus(domainKey, e.target.value as DomainStatus)} aria-label={`${label} readiness status`}
          className={'shrink-0 cursor-pointer rounded-full border px-2 py-1 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 ' + D_STATUS_CLS[res.status]}>
          {D_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {steps.length > 0 && (
        <ul className="mt-3 space-y-2">{steps.map((s) => <StepRow key={s.id} step={s} actions={actions} />)}</ul>
      )}

      {allDone && res.status !== 'ready' && (
        <button onClick={() => actions.setDomainStatus(domainKey, 'ready')}
          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100">
          <Check className="h-3 w-3" /> All steps done — mark this area ready?
        </button>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {isGap && !hasGapStep && res.gap && (
          <button onClick={() => actions.addGapStep(res)}
            className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-navy-800">
            <Sparkles className="h-3 w-3" /> Add recommended step
          </button>
        )}
        <AddStep context={label} onAdd={(t) => actions.addStep(domainKey, t)} />
      </div>
    </section>
  );
}

function BucketCard({ domain, label, whatReady, steps, actions }: { domain: PlanDomain; label: string; whatReady: string; steps: PlanStep[]; actions: PlanActions }) {
  const Icon = DOMAIN_ICON[domain];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-navy-900">{label}</h3><p className="text-xs text-slate-500">{whatReady}</p></div>
      </div>
      {steps.length > 0 && <ul className="mt-3 space-y-2">{steps.map((s) => <StepRow key={s.id} step={s} actions={actions} />)}</ul>}
      <div className="mt-2.5"><AddStep context={label} onAdd={(t) => actions.addStep(domain, t)} /></div>
    </section>
  );
}

function StepRow({ step, actions }: { step: PlanStep; actions: PlanActions }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const done = step.status === 'completed';
  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start gap-2">
        <button onClick={() => actions.setStepStatus(step.id, done ? 'planned' : 'completed')} aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${step.title}`}
          className={'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ' + (done ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-teal-400')}>
          <Check className="h-3 w-3" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={'text-sm font-semibold text-navy-900 ' + (done ? 'line-through opacity-60' : '')}>{step.title}</p>
            <button onClick={() => actions.removeStep(step.id)} className="shrink-0 text-slate-300 hover:text-rose-500" aria-label={`Remove step: ${step.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <select value={step.status} onChange={(e) => actions.setStepStatus(step.id, e.target.value as PlanStepStatus)} aria-label={`${step.title} status`}
              className={'cursor-pointer rounded-full border px-2 py-1 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 ' + S_STATUS_CLS[step.status]}>
              {S_STATUS.map((s) => <option key={s} value={s}>{S_STATUS_LABEL[s]}</option>)}
            </select>
            <input type="date" value={step.dueDate ?? ''} onChange={(e) => actions.setStepDue(step.id, e.target.value)} aria-label={`${step.title} due date`}
              className="rounded-md border border-slate-300 px-1.5 py-1 text-[11px] text-slate-600 focus:border-teal-500 focus:outline-none" />
            {step.url && <a href={step.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"><ExternalLink className="h-3 w-3" /> Open</a>}
            {step.jobId && <a href={`/jobs/${step.jobId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"><Briefcase className="h-3 w-3" /> Job</a>}
            <button onClick={() => setNotesOpen((v) => !v)} aria-expanded={notesOpen} aria-label={`${notesOpen ? 'Hide' : 'Edit'} notes for: ${step.title}`} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">{step.notes ? 'Notes ✎' : '+ note'}</button>
          </div>
          {notesOpen && (
            <textarea defaultValue={step.notes ?? ''} rows={2} onBlur={(e) => actions.setStepNotes(step.id, e.target.value)} placeholder="Notes…"
              className="mt-2 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          )}
        </div>
      </div>
    </li>
  );
}

function AddStep({ context, onAdd }: { context: string; onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const add = () => { const t = title.trim(); if (!t) return; onAdd(t); setTitle(''); setOpen(false); };
  if (!open) return <button onClick={() => setOpen(true)} aria-label={`Add step to ${context}`} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700"><Plus className="h-3 w-3" /> Add step</button>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setOpen(false); }} placeholder="Step…" aria-label={`New step for ${context}`}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
      <button onClick={add} aria-label={`Add step to ${context}`} className="rounded-md bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-700">Add</button>
      <button onClick={() => setOpen(false)} className="text-[11px] text-slate-400">Cancel</button>
    </span>
  );
}

function CheckinCard({ checkins, onAdd, onRemove }: { checkins: { id: string; date: string; rating: number; note: string }[]; onAdd: (rating: number, note: string) => void; onRemove?: (id: string) => void }) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const log = () => { if (!rating && !note.trim()) return; onAdd(rating || 3, note.trim()); setRating(0); setNote(''); };
  const fmt = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return y ? new Date(y, m - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d; };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900"><HeartHandshake className="h-4 w-4 text-teal-600" /> Weekly check-in</h3>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((r) => <button key={r} onClick={() => setRating(r)} className={'h-7 w-7 rounded-full text-xs font-bold ' + (rating >= r ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200')}>{r}</button>)}</div>
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') log(); }} placeholder="What went well? What was hard?"
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
        <button onClick={log} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700">Log</button>
      </div>
      {checkins.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">{checkins.slice(0, 4).map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs"><span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 font-bold text-teal-700">{c.rating}</span><span className="flex-1 text-slate-600">{c.note || <span className="text-slate-400">No note</span>}</span><span className="shrink-0 text-slate-400">{fmt(c.date)}</span>{onRemove && <button onClick={() => onRemove(c.id)} className="shrink-0 text-slate-300 hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>}</li>
        ))}</ul>
      )}
    </section>
  );
}
