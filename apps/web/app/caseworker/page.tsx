'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList, ArrowRight, Printer, AlertTriangle, CheckCircle2, Wrench,
  Users, Calendar, LifeBuoy, Plus, Trash2, Save, Phone, Globe, ShieldAlert,
  Lock, ShieldCheck,
} from 'lucide-react';
import {
  buildTrainingBridge,
  USER_CONTEXT_OPTIONS,
  CONVICTION_LABELS,
  CONVICTION_TYPE_ORDER,
  type ConvictionType,
  type UserContextMode,
  type EducationLevel,
  type TrainingBridgeStep,
} from '@dxp/shared';
import type { JobDto } from '@dxp/shared';
import { listJobs } from '../../lib/api';
import {
  useCaseload, saveParticipant, removeParticipant, newParticipantId,
  clearCaseload, setPersistEnabled, usePersistEnabled,
  BARRIER_LABELS, type Participant, type Barrier, type SupervisionKind,
} from '../../lib/caseworker-store';
import {
  scoreJobsForParticipant, barriersToResources, contextGuidance,
  participantDesiredIndustries, type ScoredCaseJob,
} from '../../lib/caseworker';

const EDUCATION_OPTIONS: [EducationLevel, string][] = [
  ['unknown', 'Not specified'],
  ['less_than_high_school', 'Less than high school'],
  ['high_school_or_ged', 'High school / GED'],
  ['some_college', 'Some college'],
  ['associate', 'Associate degree'],
  ['bachelor', "Bachelor's degree"],
  ['graduate', 'Graduate degree'],
];
const SUPERVISION_OPTIONS: [SupervisionKind, string][] = [
  ['none', 'None'], ['parole', 'Parole'], ['probation', 'Probation'], ['parole_and_probation', 'Parole + probation'],
];
const ALL_BARRIERS = Object.keys(BARRIER_LABELS) as Barrier[];

function emptyDraft(): Participant {
  return {
    id: newParticipantId(), name: '', conviction: 'other', contextMode: 'recently_released',
    supervision: 'none', yearsSinceRelease: null, education: 'unknown', skills: [],
    certifications: [], location: '', careerGoal: '', barriers: [], notes: '',
    createdAt: 0, updatedAt: 0,
  };
}

export default function CaseworkerPage() {
  const caseload = useCaseload();
  const persistEnabled = usePersistEnabled();
  const [draft, setDraft] = useState<Participant>(emptyDraft);
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof Participant>(k: K, v: Participant[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const isSaved = caseload.some((p) => p.id === draft.id);

  useEffect(() => {
    setLoading(true);
    const zip = /^\d{5}$/.test(draft.location.trim()) ? draft.location.trim() : undefined;
    listJobs({ postalCode: zip, limit: 150 })
      .then((d) => setJobs(d.results))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [draft.location]);

  const scored = useMemo(() => scoreJobsForParticipant(draft, jobs), [draft, jobs]);
  const top = useMemo(() => scored.filter((s) => s.chance !== 'low').slice(0, 10), [scored]);
  const barriersJobs = useMemo(() => scored.filter((s) => s.chance === 'low' && s.flags.length > 0).slice(0, 5), [scored]);

  const aggregatedSteps = useMemo(() => {
    const map = new Map<string, TrainingBridgeStep>();
    for (const { job } of top) {
      const bridge = buildTrainingBridge(
        { convictionType: draft.conviction, certifications: draft.certifications, desiredIndustries: participantDesiredIndustries(draft) },
        { id: job.id, title: job.title, company: job.company, description: job.description, industry: job.industry, riskTier: job.riskTier, requiredSkills: job.requiredSkills, requiredCertifications: job.requiredCertifications },
      );
      for (const s of bridge.steps) if (!map.has(s.id)) map.set(s.id, s);
    }
    return Array.from(map.values());
  }, [top, draft]);

  const resources = useMemo(() => barriersToResources(draft), [draft]);
  const guidance = contextGuidance(draft);
  const phases = useMemo(() => buildPlan(draft, top.length, aggregatedSteps, resources.length), [draft, top.length, aggregatedSteps, resources.length]);

  const save = () => saveParticipant(draft);
  const load = (p: Participant) => setDraft(p);
  const startNew = () => setDraft(emptyDraft());

  const saveAndPrint = () => {
    save();
    const payload = {
      participant: draft, generatedAt: new Date().toISOString(), guidance,
      top: top.map((t) => ({ title: t.job.title, company: t.job.company, city: t.job.locationCity, region: t.job.locationRegion, score: t.score, label: t.label, why: t.why, flags: t.flags })),
      aggregatedSteps, phases,
      resources: resources.map((r) => ({ label: r.label, resources: r.resources.map((x) => ({ name: x.name, phone: x.phone, url: x.url })) })),
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dxp:caseworker:plan', JSON.stringify(payload));
      window.open('/caseworker/plan', '_blank');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 p-8 text-white shadow-card sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_350px_at_85%_20%,rgba(245,91,29,0.18),transparent),radial-gradient(700px_350px_at_-10%_120%,rgba(30,166,156,0.25),transparent)]" />
        <div className="relative flex items-start gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
            <ClipboardList className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200">Staff view · Reentry navigator</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Caseworker Mode</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50/90">
              Build a participant&rsquo;s profile and get realistic, fair-chance-aware job matches, the barriers
              standing in their way mapped to local help, training gaps, and a printable, context-aware action
              plan — saved to your caseload so you can track progress.
            </p>
          </div>
        </div>
      </section>

      {/* Caseload */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Users className="h-3.5 w-3.5" /> Caseload ({caseload.length})
          </span>
          {caseload.map((p) => (
            <button
              key={p.id}
              onClick={() => load(p)}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ' +
                (p.id === draft.id ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50')
              }
            >
              {p.name || 'Unnamed'} · {CONVICTION_LABELS[p.conviction].split(' ')[0]}
            </button>
          ))}
          <button onClick={startNew} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700">
            <Plus className="h-3 w-3" /> New participant
          </button>
        </div>

        {/* Privacy / device-storage controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
          <p className="inline-flex items-start gap-1.5 text-xs text-slate-600">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              {persistEnabled
                ? 'Participant data is stored only in this browser on this device — it never leaves your computer. Clear it before stepping away from a shared machine.'
                : 'Session-only: nothing is saved to this device. Your caseload disappears when you close this tab.'}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPersistEnabled(!persistEnabled)}
              className={
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ' +
                (persistEnabled ? 'border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700' : 'border-teal-600 bg-teal-50 text-teal-700')
              }
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {persistEnabled ? 'Switch to session-only' : 'Session-only is on'}
            </button>
            {caseload.length > 0 && (
              <button
                type="button"
                onClick={() => { if (confirm(`Permanently clear all ${caseload.length} participant(s) from this device? This cannot be undone.`)) { clearCaseload(); startNew(); } }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear caseload
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Intake form */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Participant name"><TextInput value={draft.name} onChange={(v) => set('name', v)} placeholder="First or initials" /></Field>
          <Field label="Primary conviction">
            <Select value={draft.conviction} onChange={(v) => set('conviction', v as ConvictionType)}>
              {CONVICTION_TYPE_ORDER.map((c) => <option key={c} value={c}>{CONVICTION_LABELS[c]}</option>)}
            </Select>
          </Field>
          <Field label="Where they are now">
            <Select value={draft.contextMode} onChange={(v) => set('contextMode', v as UserContextMode)}>
              {USER_CONTEXT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Supervision">
            <Select value={draft.supervision} onChange={(v) => set('supervision', v as SupervisionKind)}>
              {SUPERVISION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>

          <Field label="Years since release">
            <TextInput type="number" value={draft.yearsSinceRelease == null ? '' : String(draft.yearsSinceRelease)} onChange={(v) => set('yearsSinceRelease', v === '' ? null : Math.max(0, Number(v)))} placeholder="e.g. 2" />
          </Field>
          <Field label="Education">
            <Select value={draft.education} onChange={(v) => set('education', v as EducationLevel)}>
              {EDUCATION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="ZIP"><TextInput value={draft.location} onChange={(v) => set('location', v)} placeholder="e.g. 43215" /></Field>
          <Field label="Career goal"><TextInput value={draft.careerGoal} onChange={(v) => set('careerGoal', v)} placeholder="e.g. CDL-A driver, welder" /></Field>

          <Field label="Skills (comma-separated)" className="lg:col-span-2"><TextInput value={draft.skills.join(', ')} onChange={(v) => set('skills', splitTags(v))} placeholder="forklift, warehouse, customer service" /></Field>
          <Field label="Certifications held (comma-separated)" className="lg:col-span-2"><TextInput value={draft.certifications.join(', ')} onChange={(v) => set('certifications', splitTags(v))} placeholder="OSHA 10, ServSafe, forklift" /></Field>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-slate-700">Barriers to address</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_BARRIERS.map((b) => {
              const on = draft.barriers.includes(b);
              return (
                <button
                  key={b}
                  onClick={() => setDraft((d) => ({ ...d, barriers: d.barriers.includes(b) ? d.barriers.filter((x) => x !== b) : [...d.barriers, b] }))}
                  className={'rounded-full border px-3 py-1 text-xs font-semibold transition ' + (on ? 'border-sunset-500 bg-sunset-50 text-sunset-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')}
                >
                  {BARRIER_LABELS[b]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <Field label="Caseworker notes">
            <textarea rows={2} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Stable transportation, finished GED in 2024, …"
              className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700">
            <Save className="h-3.5 w-3.5" /> {isSaved ? 'Update in caseload' : 'Save to caseload'}
          </button>
          <button onClick={saveAndPrint} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
            <Printer className="h-3.5 w-3.5" /> Save &amp; print action plan
          </button>
          {isSaved && (
            <button onClick={() => { if (confirm('Remove this participant from your caseload?')) { removeParticipant(draft.id); startNew(); } }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
          <Link href="/jobs" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-700">
            Browse all jobs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="mt-3 inline-flex items-start gap-1.5 rounded-lg bg-teal-50/70 px-3 py-2 text-xs text-teal-800">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {guidance}
        </p>
      </section>

      {/* Results */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
              <CheckCircle2 className="h-4 w-4 text-teal-600" /> Realistic matches <span className="text-sm font-normal text-slate-400">({top.length})</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Re-scored against {CONVICTION_LABELS[draft.conviction].toLowerCase()}, the career goal, and realistic attainability.</p>
            {loading && <p className="mt-4 text-sm text-slate-500">Scoring jobs…</p>}
            {!loading && top.length === 0 && <p className="mt-4 text-sm text-slate-500">No realistic matches in this pool yet — try a broader ZIP or adjust the goal.</p>}
            <ul className="mt-4 space-y-3">{top.map((m) => <MatchCard key={m.job.id} m={m} />)}</ul>
          </section>

          {barriersJobs.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
                <ShieldAlert className="h-4 w-4 text-amber-600" /> Likely barriers — don&rsquo;t waste the visit
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">High-ranking on paper, but flagged for a legal/employer barrier. Coach the participant before they apply.</p>
              <ul className="mt-4 space-y-2">
                {barriersJobs.map((m) => (
                  <li key={m.job.id} className="rounded-xl border border-amber-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-navy-900">{m.job.title}</p>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{m.label}</span>
                    </div>
                    <p className="text-xs text-slate-500">{m.job.company}</p>
                    <p className="mt-1 inline-flex items-start gap-1 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {m.flags[0]}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900"><Wrench className="h-4 w-4 text-teal-600" /> Training gaps <span className="text-sm font-normal text-slate-400">({aggregatedSteps.length})</span></h2>
            {aggregatedSteps.length === 0
              ? <p className="mt-2 text-sm text-slate-500">No common credential gaps across the top matches.</p>
              : <ul className="mt-3 space-y-2">{aggregatedSteps.slice(0, 6).map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                    <p className="text-sm font-semibold text-navy-900">{s.title}{s.estDuration ? <span className="ml-1.5 text-[11px] font-normal text-slate-400">· {s.estDuration}</span> : null}</p>
                    {s.reason && <p className="mt-0.5 text-xs text-slate-600">{s.reason}</p>}
                  </li>))}</ul>}
          </section>

          {resources.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900"><LifeBuoy className="h-4 w-4 text-teal-600" /> Connect to local help</h2>
              <p className="mt-0.5 text-xs text-slate-500">Based on the barriers you flagged.</p>
              <div className="mt-3 space-y-3">
                {resources.map((r) => (
                  <div key={r.key}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{r.label}</p>
                    <ul className="mt-1 space-y-1.5">
                      {r.resources.slice(0, 2).map((res) => (
                        <li key={res.id} className="rounded-lg border border-slate-200 p-2">
                          <p className="text-sm font-semibold text-navy-900">{res.name}</p>
                          <div className="mt-0.5 flex flex-wrap gap-2 text-[11px]">
                            {res.phone && <a href={`tel:${res.phone.replace(/[^\d]/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"><Phone className="h-3 w-3" /> {res.phone}</a>}
                            <a href={res.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"><Globe className="h-3 w-3" /> Website</a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <Link href="/local-help" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                Full local-help directory <ArrowRight className="h-3 w-3" />
              </Link>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900"><Calendar className="h-4 w-4 text-teal-600" /> {planTitle(draft.contextMode)}</h2>
            <div className="mt-3 space-y-3">
              {phases.map((ph) => (
                <div key={ph.title}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{ph.title}</p>
                  <ul className="mt-1 space-y-1">
                    {ph.items.map((it, i) => <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" /> {it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ───────── plan builder (context-aware) ─────────

interface Phase { title: string; items: string[] }

function planTitle(mode: UserContextMode): string {
  return mode === 'currently_incarcerated' || mode === 'preparing_for_release'
    ? 'Pre-release action plan' : '30 / 60 / 90-day plan';
}

function buildPlan(p: Participant, topCount: number, steps: TrainingBridgeStep[], resourceCount: number): Phase[] {
  const cred = steps[0]?.title;
  const goal = p.careerGoal ? `toward "${p.careerGoal}"` : '';
  const resourceLine = resourceCount > 0 ? 'Connect with the flagged local resources (housing, transport, recovery, legal).' : null;

  if (p.contextMode === 'currently_incarcerated' || p.contextMode === 'preparing_for_release') {
    return [
      { title: 'Now (pre-release)', items: [
        cred ? `Start ${cred} or an available in-facility credential ${goal}`.trim() : `Identify in-facility training ${goal}`.trim(),
        'Gather/replace ID documents (state ID, Social Security card, birth certificate).',
        'Build a basic résumé from work assignments and any certifications.',
      ] },
      { title: 'Release area', items: [
        topCount > 0 ? `Target the ${topCount} realistic roles identified here in the release area.` : 'Set a target ZIP and re-run matches for the release area.',
        'Line up a first appointment at the local American Job Center for week one.',
        resourceLine ?? 'Identify reentry housing/transport before release.',
      ] },
      { title: 'First 30 days out', items: [
        'Apply to the strongest matches; bring ID + résumé to walk-ins.',
        'Check in with caseworker weekly; record progress on the printable plan.',
      ] },
    ];
  }

  // recently_released / in_the_community / on_supervision
  const compliance = p.contextMode === 'on_supervision'
    ? 'Confirm hours, travel, and industry restrictions with the supervising officer.'
    : null;
  return [
    { title: '30 days', items: [
      topCount > 0 ? `Apply to the ${Math.min(5, topCount)} strongest matches ${goal}`.trim() : 'Broaden the search ZIP and re-run matches.',
      cred ? `Enroll in / schedule ${cred}.` : 'Refresh résumé with current skills and certifications.',
      compliance,
      resourceLine,
    ].filter(Boolean) as string[] },
    { title: '60 days', items: [
      'Apply to additional "worth a look" roles; attend one hiring event or job-center orientation.',
      cred ? `Complete ${cred} and add it to the résumé.` : 'Add one stackable credential aligned to the goal.',
    ] },
    { title: '90 days', items: [
      'Target apprenticeships or higher-wage roles unlocked by new credentials.',
      'Review progress with caseworker and reset the next 90-day goal.',
    ] },
  ];
}

// ───────── small components ─────────

function MatchCard({ m }: { m: ScoredCaseJob }) {
  const tone = m.chance === 'high' ? 'bg-teal-50 text-teal-700 ring-teal-200' : 'bg-sky-50 text-sky-700 ring-sky-200';
  const loc = [m.job.locationCity, m.job.locationRegion].filter(Boolean).join(', ');
  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900">{m.job.title}</p>
          <p className="text-xs text-slate-500">{m.job.company}{loc ? ` · ${loc}` : ''}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone}`}>{m.label} · {m.score}%</span>
      </div>
      <p className="mt-2 text-xs text-slate-600"><span className="font-semibold text-slate-700">Why:</span> {m.why}</p>
      {m.flags.length > 0 && (
        <p className="mt-1 inline-flex items-start gap-1 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {m.flags[0]}</p>
      )}
    </li>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={'block text-sm ' + (className ?? '')}>
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />;
}
function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)}
    className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500">{children}</select>;
}
function splitTags(v: string): string[] {
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}
