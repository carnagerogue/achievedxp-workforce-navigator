/**
 * Supervision / employment-verification summary.
 *
 * What most often sends someone back to prison is a *technical* violation — a
 * missed check-in or a failure to show job-search effort (employment is a hard
 * supervision condition). This builds a clean, dated, officer-ready record from
 * the data the person already tracks (their plan's job applications, completed
 * steps, readiness, weekly check-ins) so they can prove effort with no friction.
 * Browser-local + self-reported until an authenticated PO tier exists.
 */
import { READINESS_DOMAINS, BAND_LABEL } from './readiness';
import { PLAN_BUCKETS, type PlanModel, type PlanDomain, type PlanStepStatus } from './plan-model';

export interface SupervisionInfo {
  officerName?: string;
  supervisionType?: 'parole' | 'probation' | 'none';
  nextReportDate?: string; // ISO yyyy-mm-dd
}

// ── Supervision conditions ────────────────────────────────────────────────
export type ConditionType =
  | 'check_in' | 'drug_test' | 'program' | 'community_service'
  | 'curfew' | 'travel' | 'no_contact' | 'employment' | 'fees' | 'other';
export type ConditionCadence = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'as_needed';
export type ConditionStatus = 'met' | 'due_soon' | 'overdue' | 'pending';

export interface SupervisionCondition {
  id: string;
  type: ConditionType;
  label: string;
  cadence: ConditionCadence;
  dueDate?: string;   // next due (ISO yyyy-mm-dd)
  lastMet?: string;   // last completed (ISO)
  notes?: string;
  done?: boolean;     // for one-time conditions
  createdAt: number;
}

export const CONDITION_TYPE_LABEL: Record<ConditionType, string> = {
  check_in: 'Report / check-in', drug_test: 'Drug / alcohol test', program: 'Program / class',
  community_service: 'Community service', curfew: 'Curfew', travel: 'Travel restriction',
  no_contact: 'No-contact order', employment: 'Maintain employment', fees: 'Fees / restitution', other: 'Other',
};
export const CADENCE_LABEL: Record<ConditionCadence, string> = {
  once: 'One-time', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly', as_needed: 'As needed',
};

/** Common conditions, one tap to add. */
export const CONDITION_TEMPLATES: { type: ConditionType; label: string; cadence: ConditionCadence }[] = [
  { type: 'check_in', label: 'Report to officer', cadence: 'monthly' },
  { type: 'drug_test', label: 'Drug / alcohol test', cadence: 'as_needed' },
  { type: 'employment', label: 'Maintain / seek employment', cadence: 'weekly' },
  { type: 'program', label: 'Attend required program', cadence: 'weekly' },
  { type: 'community_service', label: 'Community service hours', cadence: 'monthly' },
  { type: 'fees', label: 'Pay supervision fees', cadence: 'monthly' },
  { type: 'curfew', label: 'Observe curfew', cadence: 'as_needed' },
  { type: 'travel', label: 'Stay within travel limits', cadence: 'as_needed' },
  { type: 'no_contact', label: 'Honor no-contact order', cadence: 'as_needed' },
];

const CADENCE_DAYS: Record<ConditionCadence, number> = { weekly: 7, biweekly: 14, monthly: 30, once: 0, as_needed: 0 };

export function conditionStatus(c: SupervisionCondition, now = Date.now()): ConditionStatus {
  if (c.cadence === 'once' && c.done) return 'met';
  if (c.cadence === 'as_needed') return 'pending';
  const e = dueEpoch(c.dueDate);
  if (Number.isNaN(e)) return 'pending';
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (e < today.getTime()) return 'overdue';
  if (e <= today.getTime() + 7 * DAY) return 'due_soon';
  return 'pending';
}

function isoAfter(days: number, from = Date.now()): string {
  const d = new Date(from + days * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Fields to apply when a condition is marked done — advances recurring ones. */
export function advanceCondition(c: SupervisionCondition): Partial<SupervisionCondition> {
  const todayIso = isoAfter(0);
  if (c.cadence === 'once') return { done: true, lastMet: todayIso };
  if (c.cadence === 'as_needed') return { lastMet: todayIso };
  return { lastMet: todayIso, dueDate: isoAfter(CADENCE_DAYS[c.cadence]) };
}

/** Sensible first due date for a new recurring condition (undefined for once/as-needed). */
export function defaultConditionDue(cadence: ConditionCadence): string | undefined {
  return cadence === 'once' || cadence === 'as_needed' ? undefined : isoAfter(CADENCE_DAYS[cadence]);
}

// ── Fees / fines / restitution ────────────────────────────────────────────
export type FeeKind = 'supervision_fee' | 'fine' | 'restitution' | 'program_fee' | 'other';
export interface FeePayment { id: string; date: string; amount: number; note?: string }
export interface FeeObligation {
  id: string;
  kind: FeeKind;
  label: string;
  total: number;          // total owed (USD)
  payments: FeePayment[];
  dueDate?: string;       // next payment due (ISO)
  createdAt: number;
}

export const FEE_KIND_LABEL: Record<FeeKind, string> = {
  supervision_fee: 'Supervision fee', fine: 'Court fine', restitution: 'Restitution',
  program_fee: 'Program fee', other: 'Other',
};
export const FEE_TEMPLATES: { kind: FeeKind; label: string }[] = [
  { kind: 'supervision_fee', label: 'Supervision fee' },
  { kind: 'restitution', label: 'Restitution' },
  { kind: 'fine', label: 'Court fine' },
  { kind: 'program_fee', label: 'Program fee' },
];

export const feePaid = (o: FeeObligation): number => (o.payments ?? []).reduce((s, p) => s + (p.amount || 0), 0);
export const feeBalance = (o: FeeObligation): number => Math.max(0, (o.total || 0) - feePaid(o));
export const feePct = (o: FeeObligation): number => (o.total > 0 ? Math.min(100, Math.round((feePaid(o) / o.total) * 100)) : 100);
export function feeIsBehind(o: FeeObligation, now = Date.now()): boolean {
  if (feeBalance(o) <= 0) return false;
  const e = dueEpoch(o.dueDate);
  if (Number.isNaN(e)) return false;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return e < today.getTime();
}

export interface FeesTotals { owed: number; paid: number; balance: number; behind: number }
export function feesTotals(list: FeeObligation[]): FeesTotals {
  let owed = 0, paid = 0, behind = 0;
  for (const o of list) { owed += o.total || 0; paid += feePaid(o); if (feeIsBehind(o)) behind++; }
  return { owed, paid, balance: Math.max(0, owed - paid), behind };
}

export function fmtMoney(n: number): string {
  return '$' + Math.round(n || 0).toLocaleString('en-US');
}

export interface ComplianceRead { label: string; tone: 'ok' | 'attention' | 'at_risk'; overdue: number; dueSoon: number }
export function complianceFromConditions(conditions: SupervisionCondition[]): ComplianceRead {
  let overdue = 0, dueSoon = 0;
  for (const c of conditions) {
    const s = conditionStatus(c);
    if (s === 'overdue') overdue++;
    else if (s === 'due_soon') dueSoon++;
  }
  if (overdue > 0) return { label: 'At risk', tone: 'at_risk', overdue, dueSoon };
  if (dueSoon > 0) return { label: 'Attention needed', tone: 'attention', overdue, dueSoon };
  return { label: 'On track', tone: 'ok', overdue, dueSoon };
}

export type ReportDueState = 'none' | 'ok' | 'due_soon' | 'overdue';

const DAY = 24 * 60 * 60 * 1000;
function dueEpoch(d?: string): number {
  if (!d) return NaN;
  const [y, m, dd] = d.split('-').map(Number);
  return y && m && dd ? new Date(y, m - 1, dd).getTime() : NaN;
}
export function reportDueState(nextReportDate?: string, now = Date.now()): ReportDueState {
  const e = dueEpoch(nextReportDate);
  if (Number.isNaN(e)) return 'none';
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (e < today.getTime()) return 'overdue';
  if (e <= today.getTime() + 7 * DAY) return 'due_soon';
  return 'ok';
}

export function fmtDate(d?: string): string {
  if (!d) return '—';
  const [y, m, dd] = d.split('-').map(Number);
  if (!y || !m || !dd) return d;
  return new Date(y, m - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_LABEL: Record<PlanStepStatus, string> = {
  planned: 'Planned', contacted: 'Applied', scheduled: 'Interview', completed: 'Closed/hired',
};

const DOMAIN_LABEL: Record<string, string> = {
  ...Object.fromEntries(READINESS_DOMAINS.map((d) => [d.key, d.label])),
  ...Object.fromEntries(PLAN_BUCKETS.map((b) => [b.key, b.label])),
};

export interface SupervisionSummary {
  name: string;
  officerName: string;
  supervisionType: string;
  nextReportDate?: string;
  generatedAt: string;
  jobLog: { title: string; statusLabel: string; date?: string }[];
  jobCounts: { total: number; applied: number; interviews: number; closed: number };
  completed: { domain: string; title: string }[];
  readiness: { score: number; band: string; focus: string[] };
  checkins: { date: string; rating: number; note: string }[];
  conditions: { label: string; cadence: string; statusLabel: string; nextDue?: string; lastMet?: string }[];
  compliance: ComplianceRead;
  fees: { label: string; total: number; paid: number; balance: number; behind: boolean }[];
  feesTotals: FeesTotals;
}

const COND_STATUS_LABEL: Record<ConditionStatus, string> = {
  met: 'Met', due_soon: 'Due soon', overdue: 'Overdue', pending: 'In place',
};

export function buildSupervisionSummary(model: PlanModel, info: SupervisionInfo): SupervisionSummary {
  const jobs = model.steps.filter((s) => s.domain === 'jobs');
  const jobLog = jobs.map((s) => ({ title: s.title, statusLabel: STATUS_LABEL[s.status], date: s.dueDate }));
  const count = (st: PlanStepStatus) => jobs.filter((s) => s.status === st).length;
  const jobCounts = {
    total: jobs.length,
    applied: count('contacted') + count('scheduled') + count('completed'),
    interviews: count('scheduled'),
    closed: count('completed'),
  };
  const completed = model.steps
    .filter((s) => s.status === 'completed')
    .map((s) => ({ domain: DOMAIN_LABEL[s.domain] ?? 'General', title: s.title }));

  return {
    name: model.ownerName || '—',
    officerName: info.officerName || '—',
    supervisionType: info.supervisionType && info.supervisionType !== 'none' ? info.supervisionType : '—',
    nextReportDate: info.nextReportDate,
    generatedAt: new Date().toISOString(),
    jobLog,
    jobCounts,
    completed,
    readiness: {
      score: model.readiness.score,
      band: BAND_LABEL[model.readiness.band],
      focus: model.readiness.gaps.slice(0, 5).map((g) => g.gap?.label ?? g.label),
    },
    checkins: (model.checkins ?? []).slice(0, 8).map((c) => ({ date: c.date, rating: c.rating, note: c.note })),
    conditions: (model.conditions ?? []).map((c) => ({
      label: c.label, cadence: CADENCE_LABEL[c.cadence], statusLabel: COND_STATUS_LABEL[conditionStatus(c)],
      nextDue: c.dueDate, lastMet: c.lastMet,
    })),
    compliance: complianceFromConditions(model.conditions ?? []),
    fees: (model.fees ?? []).map((o) => ({ label: o.label, total: o.total, paid: feePaid(o), balance: feeBalance(o), behind: feeIsBehind(o) })),
    feesTotals: feesTotals(model.fees ?? []),
  };
}

export function printSupervisionSummary(s: SupervisionSummary) {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=820,height=1000');
  if (!win) return;
  const esc = (v: string) => (v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  const today = new Date(s.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

  const jobRows = s.jobLog.length
    ? s.jobLog.map((j) => `<tr><td>${esc(j.title)}</td><td>${esc(j.statusLabel)}</td><td>${esc(fmtDate(j.date))}</td></tr>`).join('')
    : `<tr><td colspan="3" class="muted">No applications logged yet.</td></tr>`;
  const completedHtml = s.completed.length
    ? `<ul>${s.completed.map((c) => `<li><b>${esc(c.domain)}:</b> ${esc(c.title)}</li>`).join('')}</ul>`
    : `<p class="muted">No completed steps yet.</p>`;
  const focusHtml = s.readiness.focus.length
    ? `<ul>${s.readiness.focus.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
  const ciHtml = s.checkins.length
    ? `<ul>${s.checkins.map((c) => `<li>${esc(fmtDate(c.date))} · ${c.rating}/5${c.note ? ` — ${esc(c.note)}` : ''}</li>`).join('')}</ul>`
    : `<p class="muted">No check-ins logged yet.</p>`;
  const condHtml = s.conditions.length
    ? `<table><thead><tr><th>Condition</th><th>Cadence</th><th>Status</th><th>Next due</th></tr></thead><tbody>${s.conditions.map((c) => `<tr><td>${esc(c.label)}</td><td>${esc(c.cadence)}</td><td>${esc(c.statusLabel)}</td><td>${esc(fmtDate(c.nextDue))}</td></tr>`).join('')}</tbody></table>`
    : `<p class="muted">No conditions tracked yet.</p>`;
  const feesHtml = s.fees.length
    ? `<table><thead><tr><th>Obligation</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${s.fees.map((f) => `<tr><td>${esc(f.label)}${f.behind ? ' <b style="color:#b91c1c">(behind)</b>' : ''}</td><td>${fmtMoney(f.total)}</td><td>${fmtMoney(f.paid)}</td><td>${fmtMoney(f.balance)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${fmtMoney(s.feesTotals.owed)}</b></td><td><b>${fmtMoney(s.feesTotals.paid)}</b></td><td><b>${fmtMoney(s.feesTotals.balance)}</b></td></tr></tbody></table>`
    : `<p class="muted">No financial obligations tracked.</p>`;

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Employment &amp; Supervision Summary</title>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:32px;font-size:13px}
    h1{font-size:20px;margin:0 0 2px} .tag{color:#0f766e;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .grid{margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;font-size:12px;color:#475569}
    .grid b{color:#0f172a}
    .prov{margin-top:10px;padding:8px 10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:11px;color:#9a3412}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#0f766e;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:3px}
    .counts{display:flex;gap:10px;margin:6px 0} .counts div{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center}
    .counts b{display:block;font-size:18px;color:#0f766e}
    table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px} th{color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
    ul{margin:4px 0;padding-left:18px} li{margin:2px 0;color:#334155} .muted{color:#94a3b8}
    .sign{margin-top:28px;display:flex;gap:48px} .sign div{flex:1;border-top:1px solid #94a3b8;padding-top:4px;color:#475569;font-size:11px}
    .foot{margin-top:16px;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;padding-top:8px}
    @media print{body{margin:16mm}}
  </style></head><body>
    <div class="tag">Achieve DXP · Workforce Navigator</div>
    <h1>Employment &amp; Supervision Summary</h1>
    <div class="grid">
      <p><b>Name:</b> ${esc(s.name)}</p><p><b>Prepared:</b> ${today}</p>
      <p><b>Supervision:</b> ${esc(cap(s.supervisionType))}</p><p><b>Officer:</b> ${esc(s.officerName)}</p>
      <p><b>Next report date:</b> ${esc(fmtDate(s.nextReportDate))}</p><p><b>Readiness:</b> ${s.readiness.score}% · ${esc(s.readiness.band)}</p>
    </div>
    <div class="prov">Self-reported by the participant for supervision review. Not an employer or agency record.</div>

    <h2>Supervision conditions — ${esc(s.compliance.label)}${s.compliance.overdue ? ` (${s.compliance.overdue} overdue)` : ''}</h2>${condHtml}

    <h2>Fees, fines &amp; restitution${s.feesTotals.balance > 0 ? ` — ${esc(fmtMoney(s.feesTotals.balance))} balance` : ' — paid in full'}</h2>${feesHtml}

    <h2>Job-search activity</h2>
    <div class="counts">
      <div><b>${s.jobCounts.total}</b>applications on plan</div>
      <div><b>${s.jobCounts.applied}</b>applied / contacted</div>
      <div><b>${s.jobCounts.interviews}</b>interviews</div>
      <div><b>${s.jobCounts.closed}</b>offers / hired</div>
    </div>
    <table><thead><tr><th>Role</th><th>Status</th><th>Date</th></tr></thead><tbody>${jobRows}</tbody></table>

    <h2>Programs &amp; steps completed</h2>${completedHtml}
    ${focusHtml ? `<h2>Current focus areas</h2>${focusHtml}` : ''}
    <h2>Weekly check-ins</h2>${ciHtml}

    <div class="sign"><div>Participant signature / date</div><div>Officer / case manager signature / date</div></div>
    <p class="foot">Job postings and labor-market data from the U.S. Department of Labor (CareerOneStop) and public job boards. This summary reflects self-reported progress to support the supervision relationship.</p>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
