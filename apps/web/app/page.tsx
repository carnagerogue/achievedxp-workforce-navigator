import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  Briefcase,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { PosterStats } from '../components/PosterStats';

export default function LandingPage() {
  return (
    <div className="animate-fade-in">
      {/* ── Act 1 · The statement ─────────────────────────────────────── */}
      <section className="flex min-h-[78vh] flex-col items-center justify-center py-24 text-center sm:py-28">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Achieve DXP · Workforce Navigator
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-6 text-6xl font-semibold leading-[0.98] tracking-display text-slate-900 sm:text-7xl lg:text-[6.5rem]">
            One clear
            <br />
            next step.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-slate-500 sm:text-xl">
            A guided path for life after release —
            backed by real reentry research.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-teal-600 py-3.5 pl-7 pr-6 text-base font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98]"
            >
              Start here
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center rounded-full px-6 py-3.5 text-base font-semibold text-slate-500 transition hover:text-slate-900"
            >
              Just browse jobs
            </Link>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <p className="mt-12 text-xs text-slate-400">Free. No account. Everything stays on your device.</p>
        </Reveal>
      </section>

      {/* ── Act 2 · The poster ────────────────────────────────────────── */}
      <section className="full-bleed bg-teal-900 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-300/70">Right now</p>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <PosterStats />
          </Reveal>
        </div>
      </section>

      {/* ── Act 3 · Three steps ───────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl py-24 sm:py-32">
        <Reveal>
          <h2 className="text-center text-4xl font-semibold tracking-display text-slate-900 sm:text-5xl">
            Three steps.
            <span className="text-slate-400"> No black box.</span>
          </h2>
        </Reveal>
        <ol className="mt-20 space-y-20">
          <EditorialStep n="01" title="Start with your compass." body="A few quick questions, and the one step that matters most right now — in the order reentry research says works." />
          <EditorialStep n="02" title="Build your plan as you go." body="Steps, supervision dates, readiness, and check-ins live in one plan. Every tool here feeds it." />
          <EditorialStep n="03" title="Find work that says yes." body="Every posting scored against your background — Strong, Possible, or Challenging, with the reasons in plain English." />
        </ol>
      </section>

      {/* ── Act 4 · The product ───────────────────────────────────────── */}
      <section className="full-bleed bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-4xl font-semibold tracking-display text-slate-900 sm:text-5xl">
              Every ranking,
              <span className="text-slate-400"> explained.</span>
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <div className="mx-auto mt-16 max-w-xl">
              <HeroPreview />
            </div>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-10 max-w-md text-center text-sm leading-relaxed text-slate-400">
              Deterministic scoring — conviction-to-duty relevance, hard barriers, employer
              posture — with every component visible. A caseworker can reproduce any score by hand.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Act 5 · Principles ────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl py-24 text-center sm:py-32">
        <Principle title="Your data stays yours." body="Background details never reach employers. Your plan lives on your device." />
        <Principle title="Dignity, throughout." body="Neutral language everywhere — in what you see, and in the code itself." />
        <Principle title="Built with caseworkers." body="Share your plan when you choose. Revoke it when you choose." />
      </section>

      {/* ── Act 6 · Begin ─────────────────────────────────────────────── */}
      <section className="full-bleed bg-navy-900 py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <Reveal>
            <h2 className="text-5xl font-semibold tracking-display text-white sm:text-6xl">Begin today.</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto mt-5 max-w-sm text-base text-slate-300">
              From day one — one step at a time.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <Link
              href="/dashboard"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white py-3.5 pl-7 pr-6 text-base font-semibold text-navy-900 transition hover:bg-teal-50 active:scale-[0.98]"
            >
              Start here
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function EditorialStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li>
      <Reveal className="grid grid-cols-[auto_1fr] items-start gap-6 sm:gap-10">
        <span aria-hidden="true" className="text-6xl font-semibold leading-none tracking-display text-slate-200 tabular-nums sm:text-7xl">{n}</span>
        <div className="pt-1.5 sm:pt-3">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</h3>
          <p className="mt-2 max-w-md text-base leading-relaxed text-slate-500">{body}</p>
        </div>
      </Reveal>
    </li>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <Reveal className="py-10 sm:py-12">
      <h3 className="text-3xl font-semibold tracking-display text-slate-900 sm:text-4xl">{title}</h3>
      <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-500">{body}</p>
    </Reveal>
  );
}

// ───────── pieces ─────────

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

function MiniCard({ Icon, iconCls, label, value }: { Icon: typeof CheckCircle2; iconCls: string; label: string; value: string }) {
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
