'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Wrench, LifeBuoy, Landmark, ListChecks, CheckCircle2, User, Gauge } from 'lucide-react';
import { CONVICTION_LABELS, USER_CONTEXT_OPTIONS, type JobDto, type TrainingBridgeStep } from '@dxp/shared';
import {
  useParticipant, getParticipant, newParticipantId, setReadiness, setSupervisionMeta,
  addCondition, updateCondition, removeCondition, addFee, updateFee, removeFee,
  type Participant, type Barrier,
} from '../../../lib/caseworker-store';
import { buildSupervisionSummary, printSupervisionSummary, advanceCondition, defaultConditionDue } from '../../../lib/supervision';
import {
  assessReadiness, participantToReadinessInput, BAND_LABEL,
  type ReadinessDomainKey, type DomainStatus, type DomainResult,
} from '../../../lib/readiness';
import { PlanWorkspace } from '../../../components/plan/PlanWorkspace';
import { deriveStepDomain, type PlanModel, type PlanActions, type PlanStep, type PlanDomain } from '../../../lib/plan-model';
import { getRepo } from '../../../lib/caseworker-repo';
import {
  scoreJobsForParticipant, barriersToResources, contextGuidance,
  aggregateTrainingSteps, trainingStepCategory, type ScoredCaseJob,
} from '../../../lib/caseworker';
import { listJobs } from '../../../lib/api';
import { useDebounce } from '../../../lib/use-debounce';
import { progressPct, openTasks, overdueTasks } from '../../../lib/caseworker-progress';
import { nextBestAction } from '../../../lib/caseworker-nba';
import { buildPlan, planTitle } from '../../../lib/caseworker-plan';
import { loadDolIntel } from '../../../lib/caseworker-dol';
import { PlanShareDialog } from '../../../components/plan/PlanShareDialog';
import { participantToPortable } from '../../../lib/plan-transfer';
import { WorkspaceHeader } from '../../../components/caseworker/workspace/WorkspaceHeader';
import { IntakePanel } from '../../../components/caseworker/workspace/IntakePanel';
import { MatchesPanel } from '../../../components/caseworker/workspace/MatchesPanel';
import { BarriersPanel } from '../../../components/caseworker/workspace/BarriersPanel';
import { TrainingPanel } from '../../../components/caseworker/workspace/TrainingPanel';
import { DolIntelPanel } from '../../../components/caseworker/workspace/DolIntelPanel';
import { NotesPanel } from '../../../components/caseworker/workspace/NotesPanel';

function emptyDraft(id: string): Participant {
  return {
    id, name: '', conviction: 'other', contextMode: 'recently_released',
    supervision: 'none', yearsSinceRelease: null, education: 'unknown', skills: [],
    certifications: [], location: '', careerGoal: '', barriers: [], notes: '',
    tasks: [], createdAt: 0, updatedAt: 0,
  };
}

const contextLabel = (mode: string) => USER_CONTEXT_OPTIONS.find((o) => o.value === mode)?.label ?? mode;

const NAV = [
  { id: 'intake', label: 'Profile', Icon: User },
  { id: 'plan', label: 'Plan & readiness', Icon: Gauge },
  { id: 'matches', label: 'Matches', Icon: CheckCircle2 },
  { id: 'barriers', label: 'Local help', Icon: LifeBuoy },
  { id: 'training', label: 'Training', Icon: Wrench },
  { id: 'dol', label: 'Labor market', Icon: Landmark },
];

const GAP_TASK_CATEGORY = (cat: string): 'training' | 'appointment' | 'barrier' | 'document' =>
  cat === 'training' ? 'training' : cat === 'employment' ? 'appointment' : cat === 'legal' ? 'document' : 'barrier';

const DOMAIN_TASK_CATEGORY = (d: PlanDomain): 'training' | 'appointment' | 'barrier' | 'document' | 'application' | 'other' =>
  d === 'jobs' ? 'application'
  : d === 'credentials_skills' || d === 'education' || d === 'digital_literacy' ? 'training'
  : d === 'work_readiness' ? 'appointment'
  : d === 'id_documents' ? 'document'
  : d === 'general' ? 'other'
  : 'barrier';

export default function ParticipantWorkspace() {
  const params = useParams();
  const routeId = (Array.isArray(params.id) ? params.id[0] : params.id) ?? 'new';
  const isNew = routeId === 'new';
  const [pid] = useState(() => (isNew ? newParticipantId() : routeId));

  const participant = useParticipant(pid);
  // Start from an empty draft and hydrate from storage in an effect — keeps SSR
  // and the first client render identical (no hydration mismatch), matching the
  // deferred-localStorage pattern used elsewhere in the app.
  const [draft, setDraft] = useState<Participant>(() => emptyDraft(pid));
  const [mounted, setMounted] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const seeded = useRef(isNew); // existing participants seed once on load
  const dirty = useRef(false);
  const urlReplaced = useRef(isNew ? false : true);

  useEffect(() => { setMounted(true); }, []);

  // Seed the editable draft from storage once the participant is available.
  useEffect(() => {
    if (!seeded.current && participant) {
      setDraft(participant);
      seeded.current = true;
    }
  }, [participant]);

  const set = <K extends keyof Participant>(k: K, v: Participant[K]) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const toggleBarrier = (b: Barrier) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, barriers: d.barriers.includes(b) ? d.barriers.filter((x) => x !== b) : [...d.barriers, b] }));
  };

  // ── Autosave (debounced), never clobbering store-managed tasks ──
  const debouncedDraft = useDebounce(draft, 500);
  function persist(d: Participant) {
    const live = getParticipant(pid);
    getRepo().save({
      ...d,
      tasks: live?.tasks ?? d.tasks ?? [],
      createdAt: live?.createdAt || Date.now(),
    });
    if (!urlReplaced.current && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/caseworker/${pid}`);
      urlReplaced.current = true;
    }
  }
  useEffect(() => {
    if (dirty.current) { persist(debouncedDraft); dirty.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft]);

  function ensurePersist() {
    if (!getParticipant(pid)) persist(draft);
  }

  // ── Jobs + scoring (shared across panels) ──
  const debouncedLocation = useDebounce(draft.location, 400);
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let live = true;
    setLoading(true);
    const zip = /^\d{5}$/.test(debouncedLocation.trim()) ? debouncedLocation.trim() : undefined;
    (async () => {
      try {
        let d = await listJobs({ postalCode: zip, limit: 150 });
        // The ZIP filter buckets by the first 2 digits and drops postings with
        // no ZIP — so an out-of-area ZIP (or aggregated jobs without a postal
        // code) can zero out the pool. Fall back to a broad pull so a
        // participant always gets scored matches.
        if (zip && d.results.length === 0) d = await listJobs({ limit: 150 });
        if (live) setJobs(d.results);
      } catch {
        if (live) setJobs([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [debouncedLocation]);

  const scored = useMemo(() => scoreJobsForParticipant(draft, jobs), [draft, jobs]);
  const top = useMemo(() => scored.filter((s) => s.chance !== 'low').slice(0, 10), [scored]);
  const barriersJobs = useMemo(() => scored.filter((s) => s.chance === 'low' && s.flags.length > 0).slice(0, 5), [scored]);
  const aggregatedSteps = useMemo(() => aggregateTrainingSteps(draft, top.map((t) => t.job)), [draft, top]);
  const resources = useMemo(() => barriersToResources(draft), [draft]);

  const merged = useMemo(() => ({ ...draft, tasks: participant?.tasks ?? [] }), [draft, participant]);
  const pct = progressPct(merged);
  const nba = useMemo(
    () => nextBestAction(merged, { topMatchCount: top.length, trainingGapCount: aggregatedSteps.length }),
    [merged, top.length, aggregatedSteps.length],
  );
  const readiness = useMemo(
    () => assessReadiness(participantToReadinessInput(merged, aggregatedSteps.length), participant?.readiness ?? {}),
    [merged, aggregatedSteps.length, participant?.readiness],
  );

  // ── Added-state sets for "in plan" affordances ──
  const taskIds = new Set((participant?.tasks ?? []).map((t) => t.id));
  const addedJobIds = new Set(
    (participant?.tasks ?? []).filter((t) => t.ref?.jobId).map((t) => t.ref!.jobId as string),
  );

  // ── Task generators ──
  const addMatch = (m: ScoredCaseJob) => {
    ensurePersist();
    getRepo().reconcileGeneratedTasks(pid, [{
      id: `match:${m.job.id}`, title: `Apply: ${m.job.title} — ${m.job.company}`,
      category: 'application', source: 'match', domain: 'jobs', ref: { jobId: m.job.id },
    }]);
  };
  const addTraining = (s: TrainingBridgeStep) => {
    ensurePersist();
    getRepo().reconcileGeneratedTasks(pid, [{
      id: `train:${s.id}`, title: `Training: ${s.title}`,
      category: trainingStepCategory(s), source: 'training', domain: 'credentials_skills',
      notes: s.reason, ref: { url: s.externalUrl, stepId: s.id },
    }]);
  };
  const BARRIER_DOMAIN: Record<string, PlanDomain> = {
    transit: 'transportation', housing: 'housing', health: 'health_recovery',
    legal: 'legal_compliance', food: 'finances', family: 'support_network',
  };
  const addBarrier = (res: { id: string; name: string; url: string }, key: string) => {
    ensurePersist();
    getRepo().reconcileGeneratedTasks(pid, [{
      id: `barrier:${res.id}`, title: `Connect: ${res.name}`,
      category: 'barrier', source: 'barrier', notes: key,
      domain: BARRIER_DOMAIN[key] ?? 'general', ref: { url: res.url },
    }]);
  };
  const addCenter = (c: { id: string; name: string; url?: string }) => {
    ensurePersist();
    getRepo().reconcileGeneratedTasks(pid, [{
      id: `dol-ajc:${c.id}`, title: `Visit Job Center: ${c.name}`,
      category: 'appointment', source: 'dol', domain: 'work_readiness', ref: { url: c.url },
    }]);
  };
  const setDomainStatus = (domain: ReadinessDomainKey, status: DomainStatus) => {
    ensurePersist();
    setReadiness(pid, domain, status);
  };
  const addReadinessGap = (g: DomainResult) => {
    if (!g.gap) return;
    ensurePersist();
    getRepo().reconcileGeneratedTasks(pid, [{
      id: `readiness:${g.key}`, title: g.gap.taskTitle,
      category: GAP_TASK_CATEGORY(g.gap.category), source: 'plan',
      notes: g.gap.category, domain: g.key, ref: g.gap.url ? { url: g.gap.url } : undefined,
    }]);
  };

  // ── Unified plan model + actions (merged Readiness + action plan) ──
  const supervisionType: 'parole' | 'probation' | 'none' =
    draft.supervision === 'probation' ? 'probation' : draft.supervision === 'none' ? 'none' : 'parole';
  const planModel: PlanModel = useMemo(() => ({
    ownerName: draft.name,
    goals: draft.careerGoal,
    readiness,
    isCaseworker: true,
    supervision: { officerName: draft.officerName, supervisionType, nextReportDate: draft.nextReportDate },
    conditions: participant?.conditions ?? [],
    fees: participant?.fees ?? [],
    steps: (participant?.tasks ?? []).map((t): PlanStep => ({
      id: t.id, title: t.title, status: t.status,
      domain: t.domain ?? deriveStepDomain(t),
      dueDate: t.dueDate, notes: t.notes, url: t.ref?.url, jobId: t.ref?.jobId, source: t.source,
    })),
  }), [draft.name, draft.careerGoal, draft.officerName, draft.nextReportDate, supervisionType, readiness, participant]);

  const planActions: PlanActions = {
    setDomainStatus,
    addGapStep: addReadinessGap,
    addStep: (domain, title) => { ensurePersist(); getRepo().addTask(pid, { title, category: DOMAIN_TASK_CATEGORY(domain), source: 'manual', domain }); },
    setStepStatus: (id, s) => getRepo().setTaskStatus(pid, id, s),
    setStepDue: (id, d) => getRepo().updateTask(pid, id, { dueDate: d || undefined }),
    setStepNotes: (id, n) => getRepo().updateTask(pid, id, { notes: n }),
    removeStep: (id) => getRepo().removeTask(pid, id),
    setSupervision: (patch) => {
      ensurePersist();
      if (patch.supervisionType !== undefined) set('supervision', patch.supervisionType);
      const meta: { officerName?: string; nextReportDate?: string } = {};
      if (patch.officerName !== undefined) meta.officerName = patch.officerName;
      if (patch.nextReportDate !== undefined) meta.nextReportDate = patch.nextReportDate;
      if (Object.keys(meta).length) setSupervisionMeta(pid, meta);
    },
    addCondition: (c) => { ensurePersist(); addCondition(pid, { id: `cond_${Math.random().toString(36).slice(2, 9)}`, type: c.type, label: c.label, cadence: c.cadence, dueDate: c.dueDate ?? defaultConditionDue(c.cadence), createdAt: Date.now() }); },
    markConditionMet: (id) => { const c = (participant?.conditions ?? []).find((x) => x.id === id); if (c) updateCondition(pid, id, advanceCondition(c)); },
    setConditionDue: (id, d) => updateCondition(pid, id, { dueDate: d || undefined }),
    removeCondition: (id) => removeCondition(pid, id),
    addFee: (f) => { ensurePersist(); addFee(pid, { id: `fee_${Math.random().toString(36).slice(2, 9)}`, kind: f.kind, label: f.label, total: f.total, dueDate: f.dueDate, payments: [], createdAt: Date.now() }); },
    logPayment: (feeId, amount, date, note) => { const o = (participant?.fees ?? []).find((x) => x.id === feeId); if (o) updateFee(pid, feeId, { payments: [...(o.payments ?? []), { id: `pay_${Math.random().toString(36).slice(2, 9)}`, amount, date, note }] }); },
    removePayment: (feeId, paymentId) => { const o = (participant?.fees ?? []).find((x) => x.id === feeId); if (o) updateFee(pid, feeId, { payments: (o.payments ?? []).filter((p) => p.id !== paymentId) }); },
    setFeeDue: (feeId, d) => updateFee(pid, feeId, { dueDate: d || undefined }),
    removeFee: (feeId) => removeFee(pid, feeId),
    onSupervisionSummary: () => { ensurePersist(); printSupervisionSummary(buildSupervisionSummary(planModel, planModel.supervision ?? {})); },
    onPrint: () => saveAndPrint(),
    onShare: () => { ensurePersist(); setShowExport(true); },
  };

  const jump = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Scroll-spy: highlight the section currently in view in the side nav.
  const [activeSection, setActiveSection] = useState('intake');
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActiveSection((vis[0].target as HTMLElement).id);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    NAV.forEach((n) => { const el = document.getElementById(n.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [participant, mounted]);

  const saveAndPrint = async () => {
    ensurePersist();
    persist(draft);
    const live = getParticipant(pid) ?? merged;
    const phases = buildPlan(merged, top.length, aggregatedSteps, resources.length);
    let dol = null;
    try {
      if (/^\d{5}$/.test(draft.location.trim())) {
        const d = await loadDolIntel(draft.careerGoal, draft.location.trim());
        dol = {
          wages: d.wages,
          centers: d.centers.slice(0, 3).map((c) => ({ name: c.Name, phone: c.Phone, address: `${c.City}, ${c.StateAbbr}` })),
          licenses: d.licenses.slice(0, 4).map((l) => ({ title: l.title, description: l.description })),
          apprenticeships: d.apprenticeships.slice(0, 4).map((a) => ({ title: a.title, sponsor: a.sponsor })),
        };
      }
    } catch { /* dol optional */ }

    const payload = {
      participant: live, generatedAt: new Date().toISOString(), guidance: contextGuidance(draft),
      top: top.map((t) => ({ title: t.job.title, company: t.job.company, city: t.job.locationCity, region: t.job.locationRegion, score: t.score, label: t.label, why: t.why, flags: t.flags })),
      aggregatedSteps, phases,
      resources: resources.map((r) => ({ label: r.label, resources: r.resources.map((x) => ({ name: x.name, phone: x.phone, url: x.url })) })),
      tasks: (live.tasks ?? []).map((t) => ({ title: t.title, status: t.status, category: t.category, dueDate: t.dueDate, notes: t.notes })),
      progressPct: progressPct(live),
      readiness: { score: readiness.score, band: BAND_LABEL[readiness.band], gaps: readiness.gaps.slice(0, 6).map((g) => g.gap?.label ?? g.label) },
      dol,
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dxp:caseworker:plan', JSON.stringify(payload));
      window.open('/caseworker/plan', '_blank');
    }
  };

  // Existing-but-missing participant (e.g. cleared caseload). Gate on `mounted`
  // so we don't flash this during SSR/hydration before localStorage is read.
  if (mounted && !isNew && !participant && !dirty.current) {
    return (
      <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-600">This participant isn&rsquo;t on this device.</p>
        <Link href="/caseworker" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">← Back to command center</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <WorkspaceHeader
        name={draft.name}
        convictionLabel={CONVICTION_LABELS[draft.conviction]}
        contextLabel={contextLabel(draft.contextMode)}
        supervisionLabel={draft.supervision !== 'none' ? draft.supervision.replace(/_/g, ' ') : undefined}
        pct={pct}
        nba={nba}
        stats={{ open: openTasks(merged).length, overdue: overdueTasks(merged).length, matches: top.length, barriers: draft.barriers.length }}
        onPrint={saveAndPrint}
        onExport={() => { ensurePersist(); setShowExport(true); }}
        onJump={jump}
      />

      {showExport && (
        <PlanShareDialog
          plan={participantToPortable(getParticipant(pid) ?? merged)}
          audience="participant"
          onClose={() => setShowExport(false)}
        />
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Sticky section nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-0.5">
            {NAV.map((n) => {
              const active = activeSection === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => jump(n.id)}
                  className={
                    'flex w-full items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-left text-sm font-semibold transition ' +
                    (active
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800')
                  }
                >
                  <n.Icon className={'h-4 w-4 ' + (active ? 'text-teal-600' : 'text-slate-400')} /> {n.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0 space-y-6">
          <IntakePanel draft={draft} set={set} toggleBarrier={toggleBarrier} />

          <p className="inline-flex items-start gap-1.5 rounded-lg bg-teal-50/70 px-3 py-2 text-xs text-teal-800">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {contextGuidance(draft)}
          </p>

          <div id="plan" className="scroll-mt-24">
            <PlanWorkspace model={planModel} actions={planActions} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <MatchesPanel
              conviction={draft.conviction}
              top={top}
              barriersJobs={barriersJobs}
              loading={loading}
              hasZip={/^\d{5}$/.test(draft.location.trim())}
              addedJobIds={addedJobIds}
              onAdd={addMatch}
            />
            <div className="space-y-6">
              <TrainingPanel steps={aggregatedSteps} addedStepIds={taskIds} onAdd={addTraining} />
              <BarriersPanel groups={resources} addedIds={taskIds} onAdd={addBarrier} />
            </div>
          </div>

          <DolIntelPanel
            goal={draft.careerGoal}
            location={draft.location}
            addedIds={taskIds}
            onAddCenter={addCenter}
          />

          <NotesPanel
            notes={draft.notes}
            onNotes={(v) => set('notes', v)}
            participant={merged}
          />

          <p className="text-center text-xs text-slate-400">{planTitle(draft.contextMode)} · everything autosaves to this device.</p>
        </div>
      </div>
    </div>
  );
}
