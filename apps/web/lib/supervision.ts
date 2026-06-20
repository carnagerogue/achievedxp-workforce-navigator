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
}

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
