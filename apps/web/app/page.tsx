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
} from 'lucide-react';
import { LiveStats } from '../components/LiveStats';

export default function LandingPage() {
  return (
    <div className="animate-fade-in">
      {/* ─────────── Hero ─────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white bg-hero-radial shadow-card">
        <div className="grid gap-10 p-8 sm:p-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <Sparkles className="h-3.5 w-3.5" /> Achieve DXP · Workforce Navigator
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-navy-900 sm:text-5xl lg:text-[3.25rem]">
              Real-world jobs, matched to you —
              <span className="block bg-gradient-to-r from-teal-600 via-teal-500 to-sunset-500 bg-clip-text text-transparent">
                with the full picture.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              We aggregate postings from federal, private-sector, and remote job boards and score
              each one against your profile. You see the top matches, medium-fit options, and the
              ones worth skipping — every ranking explained in plain English.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/onboarding"
                className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-card-hover"
              >
                Build my profile
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition hover:border-slate-400 hover:bg-white"
              >
                <Briefcase className="h-4 w-4" />
                Browse all jobs
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
          Icon={Sparkles}
          eyebrow="Scoring"
          title="Transparent by design"
          body="Every match shows industry fit, skills, certifications, experience, location, and risk as individual chips. No hidden logic."
          tone="teal"
        />
        <Feature
          Icon={ShieldCheck}
          eyebrow="Fair chance"
          title="Second-chance aware"
          body="Hard filters remove roles that require a clean record — and explain why. Browse by conviction type to see what fits."
          tone="sunset"
        />
        <Feature
          Icon={GraduationCap}
          eyebrow="Growth"
          title="Plan-aligned"
          body="See which certifications unlock the most new matches. Close specific skill gaps on your dashboard."
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
          <Step n={1} title="Build your profile" body="Location, skills, certifications, and (optionally) a structured conviction history so we apply the right filters." />
          <Step n={2} title="We score every posting" body="Rule-based match across six components. Same rules for everyone — auditable by a caseworker." />
          <Step n={3} title="Apply with context" body="Top / Medium / Avoid buckets on your dashboard. Each card explains the rating in plain English." />
        </ol>
      </section>

      {/* ─────────── CTA band ─────────── */}
      <section className="relative mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 p-10 text-white shadow-card sm:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_10%_20%,rgba(30,166,156,0.30),transparent)] opacity-90" />
        <div className="relative">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to see your matches?</h2>
          <p className="mt-2 max-w-xl text-teal-100/90">
            Takes about two minutes. No resume upload required. Nothing from your profile is ever
            shared with employers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-teal-50"
            >
              Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              <Briefcase className="h-4 w-4" /> Explore the catalog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ───────── pieces ─────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{value}</dt>
      <dd className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</dd>
    </div>
  );
}

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
 * Static preview of a dashboard-style card. Decorative — doesn't fetch real
 * data. Gives landing visitors an instant sense of what the app produces.
 */
function HeroPreview() {
  return (
    <div className="relative h-full min-h-[340px]">
      {/* Floating match % ring */}
      <div className="absolute -right-4 -top-4 z-10 animate-slide-up rounded-2xl border border-slate-200 bg-white p-3 shadow-card-hover">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <svg viewBox="0 0 48 48" className="-rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="4" fill="none" />
              <circle
                cx="24" cy="24" r="20"
                stroke="#0f8a82" strokeWidth="4" fill="none"
                strokeLinecap="round"
                strokeDasharray="125.66"
                strokeDashoffset="18.8"
              />
            </svg>
            <span className="absolute text-sm font-bold text-teal-700">85</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Match</p>
            <p className="text-xs font-semibold text-navy-900">Strong fit</p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="relative animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[10px] font-medium text-navy-700">USAJobs</span>
              <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">Second-chance friendly</span>
            </div>
            <h4 className="mt-2 text-base font-semibold text-navy-900">Forklift Operator</h4>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
              <Building2 className="h-3.5 w-3.5" /> Defense Logistics Agency
              <span className="text-slate-300">·</span>
              <MapPin className="h-3.5 w-3.5" /> Toledo, OH
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">Why this matches:</span>{' '}
          warehousing aligns with your target industries; all required skills present;
          OSHA 10 certification met; located in your region (OH).
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {[['industry','25/25'],['skills','25/25'],['certs','15/15'],['experience','15/15'],['location','10/10'],['risk','7/10']].map(([label,v]) => (
            <span key={label} className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] text-teal-800">
              {label} {v}
            </span>
          ))}
        </div>
      </div>

      {/* Under-card mini stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <MiniCard Icon={CheckCircle2}   iconCls="text-teal-600"   label="Top" value="12" />
        <MiniCard Icon={Briefcase}      iconCls="text-amber-600"  label="Medium" value="18" />
        <MiniCard Icon={AlertTriangle}  iconCls="text-rose-600"   label="Avoid" value="3" />
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
