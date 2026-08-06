import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  MapPin,
  Briefcase,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { LiveStats } from '../components/LiveStats';

export default function LandingPage() {
  return (
    <div className="animate-fade-in">
      {/* ─────────── Hero ─────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-900/[0.07] bg-white bg-hero-radial shadow-card">
        <div className="grid gap-10 p-8 sm:p-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700">
              Workforce Navigator
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.04] tracking-display text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              One clear next step.
              <span className="block text-slate-400">From day one.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-500 sm:text-[17px]">
              A guided path for life after release, backed by real reentry research.
              Build your plan, stay ahead of supervision dates — and when you&apos;re ready,
              see real jobs scored against your background, every ranking explained in
              plain English.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-full bg-teal-600 py-3 pl-6 pr-5 text-[15px] font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98]"
              >
                Start here
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-900/[0.04] hover:text-slate-900"
              >
                Just browse jobs
              </Link>
            </div>

            <LiveStats />
          </div>

          {/* Hero preview — stylized dashboard mockup */}
          <div className="relative hidden lg:block">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ─────────── Value props ─────────── */}
      <section className="mt-12 grid gap-5 sm:grid-cols-3">
        <Feature
          Icon={ShieldCheck}
          eyebrow="Conviction-aware"
          title="Compatibility, not stigma"
          body="Pick a conviction type and every job is rescored against the specific duties of the role. You get a Strong / Possible / Challenging Match chip with a full audit trail and caseworker-friendly notes."
          tone="sunset"
        />
        <Feature
          Icon={Sparkles}
          eyebrow="Scoring"
          title="Transparent by design"
          body="Industry fit, skills, certifications, experience, location, risk — every component shown as a chip. No hidden logic. Same rules for everyone."
          tone="teal"
        />
        <Feature
          Icon={GraduationCap}
          eyebrow="Growth"
          title="Plan-aligned"
          body="Live Department of Labor data: nearby American Job Centers, reentry programs, BLS wages, state licensing rules, and apprenticeship offices."
          tone="navy"
        />
      </section>

      {/* ─────────── How it works ─────────── */}
      <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-card sm:p-10">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">Process</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Three deliberate steps. No questionnaires that go nowhere, no opaque rankings.
          </p>
        </div>

        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          <Step n={1} title="Start with your compass" body="Answer a few quick questions and we surface the one step that matters most right now — in the order reentry research says works. Everything stays on your device." />
          <Step n={2} title="Build your plan as you go" body="Steps, supervision dates, readiness, and check-ins live in one plan. Every tool here — benefits, training, local help — feeds it." />
          <Step n={3} title="Find work that says yes" body="When you're ready, every posting is scored against your background — Strong / Possible / Challenging, with the reasons in plain English. No black box." />
        </ol>
      </section>

      {/* ─────────── CTA band ─────────── */}
      <section className="relative mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 p-10 text-white shadow-card sm:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_10%_20%,rgba(30,166,156,0.30),transparent)] opacity-90" />
        <div className="relative">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">One clear next step, from day one.</h2>
          <p className="mt-2 max-w-xl text-teal-100/90">
            Free, no account needed, and everything stays on your device. Nothing you enter is ever
            shared with employers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-teal-50"
            >
              <Compass className="h-4 w-4" /> Start here <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              <Briefcase className="h-4 w-4" /> Just browse jobs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ───────── pieces ─────────

type LucideIcon = typeof Sparkles;
function Feature({
  Icon, eyebrow, title, body, tone,
}: { Icon: LucideIcon; eyebrow: string; title: string; body: string; tone: 'teal' | 'sunset' | 'navy' }) {
  const iconCls =
    tone === 'teal'   ? 'bg-teal-50   text-teal-700' :
    tone === 'sunset' ? 'bg-sunset-50 text-sunset-700' :
                        'bg-navy-50   text-navy-700';
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-6 transition hover:border-teal-200 hover:bg-white">
      <span className="absolute -top-3.5 left-5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-xs font-bold text-white shadow-sm ring-4 ring-white">
        {n}
      </span>
      <h3 className="mt-2 text-base font-semibold text-navy-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
    </li>
  );
}

/**
 * Static preview of a job-card with the new compatibility engine UI.
 * Decorative — doesn't fetch real data — but every label and signal here
 * is faithful to what the live Browse Jobs page actually produces.
 *
 * Example role chosen to demonstrate the compatibility engine without
 * misrepresenting any real employer:
 *   - Apprentice Carpenter (real apprenticeship-tagged role from our feed)
 *   - Property/theft-related conviction selected
 *   - Engine output: Possible Match · 68% — construction industry has
 *     low sensitivity, but the role lists "valid driver's license"
 *     which dings the score slightly. This mirrors the actual scoring
 *     behavior and shows the audit-friendly explanations.
 */
function HeroPreview() {
  return (
    <div className="relative h-full min-h-[340px]">
      {/* Floating chance pill */}
      <div className="absolute -right-4 -top-4 z-10 animate-slide-up rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-card-hover">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Compatibility</p>
        <p className="text-sm font-bold text-amber-800">Possible Match · 68%</p>
        <p className="text-[10px] text-amber-700">scored against property/theft conviction</p>
      </div>

      {/* Main card */}
      <div className="relative animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[10px] font-medium text-navy-700">Adzuna</span>
              <span className="rounded-full border border-sunset-200 bg-sunset-50 px-2 py-0.5 text-[10px] font-medium text-sunset-700">Apprenticeship</span>
            </div>
            <h4 className="mt-2 text-base font-semibold text-navy-900">Apprentice Carpenter</h4>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
              <Building2 className="h-3.5 w-3.5" /> Local 1750 Carpenters Union
              <span className="text-slate-300">·</span>
              <MapPin className="h-3.5 w-3.5" /> Columbus, OH
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">Why this score:</span>{' '}
          construction has minimal regulatory scrutiny, no clean-record language detected,
          and the role doesn&rsquo;t involve cash or inventory custody. Posting requires a valid
          driver&rsquo;s license — minor dock.
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {[
            ['conviction-duty', '28/30'],
            ['hard barriers', '23/25'],
            ['employer posture', '7/15'],
            ['industry', '10/10'],
          ].map(([label,v]) => (
            <span key={label} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">
              {label} {v}
            </span>
          ))}
        </div>
      </div>

      {/* Under-card mini stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <MiniCard Icon={CheckCircle2}   iconCls="text-emerald-600" label="Strong" value="62" />
        <MiniCard Icon={Briefcase}      iconCls="text-amber-600"   label="Possible" value="184" />
        <MiniCard Icon={AlertTriangle}  iconCls="text-rose-600"    label="Challenging" value="41" />
      </div>
    </div>
  );
}

function MiniCard({ Icon, iconCls, label, value }: { Icon: LucideIcon; iconCls: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-card">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconCls}`} />
        <span className="text-lg font-bold text-navy-900">{value}</span>
      </div>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
