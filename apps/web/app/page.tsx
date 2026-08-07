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
import { Marquee } from '../components/Marquee';
import { PosterStats } from '../components/PosterStats';
import { AUTH_ENABLED } from '../lib/auth-config';

export default function LandingPage() {
  // When accounts are on, login comes before anything in the system, so the
  // front door funnels into account creation / sign-in. When accounts are off
  // (graceful mode), it opens straight into the app.
  const primaryHref = AUTH_ENABLED ? '/sign-up' : '/dashboard';
  const primaryLabel = AUTH_ENABLED ? 'Create your account' : 'Start here';
  const secondaryHref = AUTH_ENABLED ? '/sign-in' : '/jobs';
  const secondaryLabel = AUTH_ENABLED ? 'Sign in' : 'Just browse jobs';
  return (
    <div className="animate-fade-in">
      {/* ── Act 1 · The billboard ─────────────────────────────────────── */}
      <section className="full-bleed flex min-h-[86vh] flex-col justify-center bg-[#f7f9fa] px-5 pb-16 pt-20 sm:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
              Achieve DXP · Workforce Navigator
            </p>
          </Reveal>
          <h1 className="mt-6 font-extrabold uppercase leading-[0.82] tracking-[-0.03em]">
            <Reveal delay={60}><span className="block text-[clamp(3.2rem,10.5vw,10rem)] text-slate-900">One clear</span></Reveal>
            <Reveal delay={140}><span className="block text-[clamp(3.2rem,10.5vw,10rem)] text-slate-900">next<span className="text-teal-600">&nbsp;step.</span></span></Reveal>
          </h1>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
              <p className="max-w-md text-lg leading-snug text-slate-500 sm:text-xl">
                A guided path for life after release —
                backed by real reentry research.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={primaryHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-teal-600 py-4 pl-8 pr-7 text-base font-bold text-white transition hover:bg-teal-700 active:scale-[0.98]"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={secondaryHref}
                  className="inline-flex items-center rounded-full px-6 py-4 text-base font-bold text-slate-500 transition hover:text-slate-900"
                >
                  {secondaryLabel}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Act 2 · The ticker ────────────────────────────────────────── */}
      <div className="full-bleed -rotate-1 border-y-4 border-slate-900 bg-slate-900 py-4">
        <Marquee duration={26}>
          <TickerRun />
        </Marquee>
      </div>

      {/* ── Act 3 · The board ─────────────────────────────────────────── */}
      <section className="full-bleed bg-teal-700 py-24 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-10">
          <Reveal>
            <p className="mb-10 text-xs font-bold uppercase tracking-[0.3em] text-teal-200">Right now</p>
          </Reveal>
          <Reveal delay={100}>
            <PosterStats />
          </Reveal>
        </div>
      </section>

      {/* ── Act 4 · Three steps, chart style ──────────────────────────── */}
      <section className="full-bleed bg-[#f7f9fa] py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-10">
          <Reveal>
            <h2 className="font-extrabold uppercase leading-[0.85] tracking-[-0.03em]">
              <span className="block text-[clamp(2.6rem,7vw,6.5rem)] text-slate-900">Three steps.</span>
              <span className="block text-[clamp(2.6rem,7vw,6.5rem)] text-slate-300">No black box.</span>
            </h2>
          </Reveal>
          <ol className="mt-16 border-t-4 border-slate-900">
            <ChartStep n="01" title="Start with your compass" body="A few quick questions, and the one step that matters most right now — in the order reentry research says works." />
            <ChartStep n="02" title="Build your plan as you go" body="Steps, supervision dates, readiness, and check-ins live in one plan. Every tool here feeds it." />
            <ChartStep n="03" title="Find work that says yes" body="Every posting scored against your background — Strong, Possible, or Challenging, with the reasons in plain English." />
          </ol>
        </div>
      </section>

      {/* ── Act 5 · The product ───────────────────────────────────────── */}
      <section className="full-bleed overflow-hidden bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-10">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <div>
                <h2 className="font-extrabold uppercase leading-[0.85] tracking-[-0.03em]">
                  <span className="block text-[clamp(2.6rem,6.5vw,6rem)] text-slate-900">Every ranking,</span>
                  <span className="block text-[clamp(2.6rem,6.5vw,6rem)] text-teal-600">explained.</span>
                </h2>
                <p className="mt-8 max-w-md text-lg leading-relaxed text-slate-500">
                  Deterministic scoring — conviction-to-duty relevance, hard barriers, employer
                  posture — with every component visible. A caseworker can reproduce any score by hand.
                </p>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="relative mx-auto max-w-xl rotate-2 transition-transform duration-500 hover:rotate-0">
                <span className="absolute -top-5 right-6 z-10 -rotate-6 rounded-full bg-sunset-500 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white">
                  Plain English
                </span>
                <HeroPreview />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Act 6 · Principles ────────────────────────────────────────── */}
      <section className="full-bleed bg-[#f7f9fa] py-24 sm:py-28">
        <div className="mx-auto max-w-[1400px] border-t-4 border-slate-900 px-5 sm:px-10">
          <BigPrinciple title="Your data stays yours." body="Background details never reach employers. Your plan lives on your device." />
          <BigPrinciple title="Dignity, throughout." body="Neutral language everywhere — in what you see, and in the code itself." />
          <BigPrinciple title="Built with caseworkers." body="Share your plan when you choose. Revoke it when you choose." />
        </div>
      </section>

      {/* ── Act 7 · Begin ─────────────────────────────────────────────── */}
      <section className="full-bleed bg-slate-950 pb-10 pt-28 sm:pt-36">
        <div className="mx-auto max-w-[1400px] px-5 text-center sm:px-10">
          <Reveal>
            <h2 className="font-extrabold uppercase leading-[0.85] tracking-[-0.03em] text-[clamp(3rem,10vw,9rem)] text-white">
              Begin<span className="text-teal-500"> today.</span>
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <Link
              href={primaryHref}
              className="group mt-12 inline-flex items-center gap-2 rounded-full bg-white py-4 pl-8 pr-7 text-base font-bold text-slate-950 transition hover:bg-teal-50 active:scale-[0.98]"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
        <div className="mt-24 border-t border-white/10 py-4">
          <Marquee duration={30}>
            <TickerRun light />
          </Marquee>
        </div>
      </section>
    </div>
  );
}

const TICKER = ['Real jobs', 'Real research', 'No black box', 'Your data stays yours', 'One step at a time', 'Free, always'];

function TickerRun({ light = false }: { light?: boolean }) {
  return (
    <>
      {TICKER.map((t) => (
        <span key={t} className="inline-flex items-center">
          <span className={'px-6 text-lg font-extrabold uppercase tracking-[0.1em] ' + (light ? 'text-white/70' : 'text-white')}>{t}</span>
          <span className={'text-lg ' + (light ? 'text-teal-500' : 'text-sunset-400')} aria-hidden="true">✦</span>
        </span>
      ))}
    </>
  );
}

function ChartStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="border-b-2 border-slate-900/15">
      <Reveal className="grid grid-cols-[auto_1fr] items-center gap-6 py-10 sm:grid-cols-[1fr_2fr] sm:gap-10 sm:py-12">
        <span aria-hidden="true" className="text-[clamp(4rem,9vw,8rem)] font-extrabold leading-[0.85] tracking-[-0.04em] text-teal-600 tabular-nums">{n}</span>
        <div>
          <h3 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900 sm:text-3xl">{title}</h3>
          <p className="mt-2 max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg">{body}</p>
        </div>
      </Reveal>
    </li>
  );
}

function BigPrinciple({ title, body }: { title: string; body: string }) {
  return (
    <Reveal className="border-b-2 border-slate-900/15 py-12 sm:py-14">
      <h3 className="text-[clamp(2rem,5vw,4rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] text-slate-900">{title}</h3>
      <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500 sm:text-lg">{body}</p>
    </Reveal>
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
