'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain, ArrowLeft, ArrowRight, CheckCircle2, Trophy, Wrench, Calculator,
  Palette, HeartHandshake, Briefcase, Clipboard, RefreshCw, Target, Wallet,
  GraduationCap, ShieldCheck,
} from 'lucide-react';
import {
  getAssessmentQuestions,
  getAssessmentResult,
  submitAssessment,
  type AssessmentQuestionsDto,
  type AssessmentResultDto,
} from '../../lib/api';
import { getUserId } from '../../lib/session';
import { useToast } from '../../components/Toast';
import { Skeleton } from '../../components/Skeleton';

type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

const DIMENSION_ICONS: Record<RiasecCode, typeof Wrench> = {
  R: Wrench, I: Calculator, A: Palette, S: HeartHandshake, E: Briefcase, C: Clipboard,
};
const DIMENSION_TONES: Record<RiasecCode, string> = {
  R: 'bg-teal-50 text-teal-700',
  I: 'bg-navy-50 text-navy-700',
  A: 'bg-sunset-50 text-sunset-700',
  S: 'bg-amber-50 text-amber-800',
  E: 'bg-teal-50 text-teal-700',
  C: 'bg-slate-100 text-slate-700',
};

export default function AssessmentPage() {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestionsDto | null>(null);
  const [existing, setExisting] = useState<AssessmentResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    const id = getUserId();
    setUserIdState(id);
    Promise.all([
      getAssessmentQuestions(),
      id ? getAssessmentResult(id).catch(() => null) : Promise.resolve(null),
    ]).then(([q, r]) => { setQuestions(q); setExisting(r); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-card animate-fade-in">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Brain className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-navy-900">Profile needed first</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          The career assessment saves to your profile. Build a profile, then come back.
        </p>
        <Link href="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
          Build my profile →
        </Link>
      </div>
    );
  }

  if (!questions) return null;

  // Already completed + not retaking → show results
  if (existing && !retaking) {
    return <Results result={existing} onRetake={() => setRetaking(true)} />;
  }

  return (
    <Quiz
      userId={userId}
      questions={questions}
      onDone={(result) => { setExisting(result); setRetaking(false); }}
    />
  );
}

/** Answering flow — 6 pages of 5 items each, with a sticky progress bar. */
function Quiz({
  userId, questions, onDone,
}: {
  userId: string;
  questions: AssessmentQuestionsDto;
  onDone: (r: AssessmentResultDto) => void;
}) {
  const toast = useToast();
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const totalPages = Math.ceil(questions.questions.length / PAGE_SIZE);
  const slice = questions.questions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Scroll to top whenever the page index changes — the user just clicked
  // Next/Back, they expect to land on question 1 of the new step. Smooth
  // for visual continuity; immediate fallback for reduced-motion users.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [page]);
  const answeredOnPage = slice.every((q) => answers[q.id] != null);
  const answeredTotal = Object.keys(answers).length;
  const progressPct = Math.round((answeredTotal / questions.questions.length) * 100);
  const isLast = page === totalPages - 1;

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await submitAssessment(userId, answers);
      toast.success('Assessment saved', `Your Holland code: ${result.hollandCode}`);
      onDone(result);
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-7 shadow-card sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            <Brain className="h-3.5 w-3.5" /> Career assessment · step {page + 1} of {totalPages}
          </p>
          <Link href="/dashboard" className="text-xs font-semibold text-slate-400 hover:text-slate-600">Exit</Link>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          How interested are you in each of these activities?
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          30 questions · about 5 minutes. Based on the U.S. Dept of Labor O*NET Interest Profiler.
        </p>

        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {answeredTotal} / {questions.questions.length} answered
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {slice.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <p className="text-base font-medium text-navy-900">
              <span className="mr-2 text-slate-400">{page * PAGE_SIZE + i + 1}.</span>
              {q.prompt}
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {questions.scale.map((s) => {
                const selected = answers[q.id] === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: s.value }))}
                    className={
                      'flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ' +
                      (selected
                        ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50')
                    }
                  >
                    <span className="text-lg font-bold">{s.value}</span>
                    <span className="text-[10px] font-medium leading-tight">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {!isLast ? (
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={!answeredOnPage}
            className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!answeredOnPage || submitting}
            className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Scoring…</>
              : <><CheckCircle2 className="h-4 w-4" /> See my results</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Results({
  result, onRetake,
}: {
  result: AssessmentResultDto;
  onRetake: () => void;
}) {
  const scores = result.scores;
  const dims: RiasecCode[] = ['R', 'I', 'A', 'S', 'E', 'C'];

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      {/* Summary */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Brain className="h-3.5 w-3.5" /> Your career assessment
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              Holland code: <span className="bg-gradient-to-r from-teal-600 to-sunset-500 bg-clip-text text-transparent">{result.hollandCode}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Completed {new Date(result.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retake assessment
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {result.topDimensions.map((d) => {
            const Icon = DIMENSION_ICONS[d.code];
            return (
              <div key={d.code} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${DIMENSION_TONES[d.code]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5 text-sunset-500" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Top dimension</p>
                    </div>
                    <h3 className="mt-0.5 text-lg font-bold text-navy-900">
                      {d.name}
                      <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">{d.code}</span>
                    </h3>
                    <p className="mt-1 text-sm leading-snug text-slate-600">{d.blurb}</p>
                    <p className="mt-2 text-xs font-semibold text-teal-700">
                      {d.score} / 25
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Career suggestions ─── */}
      {result.occupations.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
                <Target className="h-5 w-5 text-teal-600" />
                Careers you'd likely thrive in
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Curated from O*NET — ranked by Holland-code fit. Each card shows what it pays,
                what it takes to start, and how many of these roles are open in our catalog right now.
              </p>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {result.occupations.map((o) => (
              <li
                key={o.onetCode}
                className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-navy-900">{o.title}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Holland code <span className="font-mono font-semibold text-slate-700">{o.hollandCode}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      Job Zone {o.jobZone}
                      {o.fairChanceFriendly && (
                        <>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className="inline-flex items-center gap-0.5 text-teal-700">
                            <ShieldCheck className="h-3 w-3" /> fair-chance
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <FitBadge percent={o.fitPercent} />
                </div>
                <p className="text-xs leading-relaxed text-slate-700">{o.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-slate-400" />{o.preparation}</span>
                  <span className="inline-flex items-center gap-1 text-teal-700"><Wallet className="h-3.5 w-3.5" />{o.typicalWage}</span>
                </div>
                {o.liveJobCount > 0 ? (
                  <Link
                    href={`/jobs?${o.jobsQuery}`}
                    className="mt-1 inline-flex items-center gap-1 self-start rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                  >
                    View {o.liveJobCount.toLocaleString()} open {o.liveJobCount === 1 ? 'role' : 'roles'} →
                  </Link>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 self-start rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    No open roles in our pool right now
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* All dimensions chart */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-base font-semibold text-navy-900">All six dimensions</h2>
        <p className="mt-1 text-xs text-slate-500">Each score is 0–25. Higher = more interest.</p>
        <ul className="mt-4 space-y-2.5">
          {dims.map((d) => {
            const Icon = DIMENSION_ICONS[d];
            const score = scores[d];
            const pct = (score / 25) * 100;
            return (
              <li key={d} className="flex items-center gap-3 text-sm">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${DIMENSION_TONES[d]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="w-32 shrink-0 font-medium text-slate-700">
                  {d} · <span className="font-normal text-slate-500">{['','Realistic','','Investigative','Artistic','Social','Enterprising','Conventional'][['R','','I','A','S','E','C'].indexOf(d) + 1] || ''}</span>
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full rounded bg-gradient-to-r from-teal-400 to-teal-600 transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-semibold tabular-nums text-navy-900">{score}/25</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recommended industries */}
      {result.recommendedIndustries.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-base font-semibold text-navy-900">Industries aligned with your profile</h2>
          <p className="mt-1 text-xs text-slate-500">
            Based on your top two dimensions. Your match scores will nudge upward for jobs tagged here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.recommendedIndustries.map((ind) => (
              <Link
                key={ind}
                href={`/jobs?industry=${ind}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800 transition hover:bg-teal-100"
              >
                <span className="capitalize">{ind.replace(/_/g, ' ')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Back to dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/** Small percentage chip for occupation fit. Color tracks the threshold:
 *  ≥ 80% strong (teal), ≥ 60% solid (amber), else neutral (slate). */
function FitBadge({ percent }: { percent: number }) {
  const tone =
    percent >= 80 ? 'bg-teal-50 text-teal-800 border-teal-200' :
    percent >= 60 ? 'bg-amber-50 text-amber-900 border-amber-200' :
    'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${tone}`}>
      {percent}% fit
    </span>
  );
}
