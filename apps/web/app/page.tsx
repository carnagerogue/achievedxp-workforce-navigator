import Link from 'next/link';
import { ArrowRight, Check, Compass, MapPin, ShieldCheck } from 'lucide-react';
import { AUTH_ENABLED } from '../lib/auth-config';

const STEPS = [
  { n: '01', title: 'Start', copy: 'Tell us what matters right now. Skip anything you are not ready to share.' },
  { n: '02', title: 'Plan', copy: 'Turn housing, documents, supervision, training, and work into one clear sequence.' },
  { n: '03', title: 'Prepare', copy: 'Build the skills, story, and application pieces that strengthen your next move.' },
  { n: '04', title: 'Find work', copy: 'Search real openings, with fit signals and possible barriers explained.' },
];

export default function LandingPage() {
  const primaryHref = AUTH_ENABLED ? '/sign-up' : '/dashboard';
  const secondaryHref = AUTH_ENABLED ? '/sign-in' : '/jobs';

  return (
    <div className="landing-constellation full-bleed -mt-10 overflow-hidden text-white">
      <section className="constellation-hero relative min-h-[calc(100vh-60px)] border-b border-white/15 px-5 py-16 sm:px-10 lg:px-16">
        <Constellation />
        <div className="relative z-10 mx-auto grid min-h-[760px] max-w-[1500px] gap-14 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <p className="section-kicker text-sunset-300">Achieve DXP · Workforce Navigator</p>
            <h1 aria-label="One clear next step." className="display-outline mt-8 max-w-[950px] text-[clamp(4.8rem,12vw,11.5rem)] leading-[.72]">
              One clear<br />next step.
            </h1>
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-teal-100 sm:text-xl">
              A calm, practical path through reentry—from the needs that come first to work that can move life forward.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={primaryHref} className="signal-button group">
                {AUTH_ENABLED ? 'Create your account' : 'Open my navigator'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href={secondaryHref} className="signal-button signal-button--ghost">
                {AUTH_ENABLED ? 'Sign in' : 'Browse jobs first'}
              </Link>
            </div>
          </div>

          <ol className="journey-path" aria-label="How the navigator works">
            {STEPS.map((step, index) => (
              <li key={step.n} className="journey-node" style={{ marginLeft: `${index % 2 === 0 ? 0 : 36}px` }}>
                <span className="journey-dot" aria-hidden="true" />
                <span className="journey-number">{step.n}</span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-navy-900 px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-12 border-y border-white/15 py-12 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div>
              <p className="section-kicker text-sunset-300">Your route, not a maze</p>
              <h2 className="mt-5 font-display text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.82] tracking-[-.04em]">
                Four phases.<br /><span className="text-teal-300">One open path.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-teal-100 lg:justify-self-end">
              The navigator keeps the whole journey visible while highlighting only the next useful action. Nothing is hidden behind a score: you can see the evidence, the uncertainty, and what to do next.
            </p>
          </div>

          <div className="phase-grid mt-16">
            {STEPS.slice(0, 3).map((step) => (
              <article key={step.n}>
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="product-constellation px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto grid max-w-[1500px] gap-14 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div>
            <p className="section-kicker text-sunset-300">Explainable by design</p>
            <h2 className="mt-5 font-display text-[clamp(3.2rem,7vw,7.2rem)] font-black uppercase leading-[.8] tracking-[-.04em]">
              See why.<br /><span className="display-outline display-outline--small">Choose clearly.</span>
            </h2>
            <ul className="mt-10 space-y-4 text-teal-100">
              <Promise Icon={ShieldCheck}>Background details stay out of employer applications.</Promise>
              <Promise Icon={Compass}>Every recommendation includes a practical next action.</Promise>
              <Promise Icon={MapPin}>Local help and distance filters use real locations.</Promise>
            </ul>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="bg-sunset-500 px-5 py-20 text-navy-900 sm:px-10 lg:px-16 lg:py-28">
        <div className="mx-auto flex max-w-[1500px] flex-col items-start justify-between gap-8 border-y border-navy-900/35 py-10 lg:flex-row lg:items-center">
          <h2 className="font-display text-[clamp(3.8rem,9vw,9rem)] font-black uppercase leading-[.75] tracking-[-.04em]">Begin here.</h2>
          <Link href={primaryHref} className="signal-button !border-navy-900 !bg-navy-900 !text-white">
            {AUTH_ENABLED ? 'Create your account' : 'Show my next step'} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Promise({ Icon, children }: { Icon: typeof Check; children: React.ReactNode }) {
  return <li className="flex items-start gap-3 border-t border-white/15 pt-4"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-sunset-300" /><span>{children}</span></li>;
}

function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Example navigator workspace">
      <div className="product-preview__rail"><span>01 Start</span><span>02 Plan</span><span>03 Prepare</span><strong>04 Find work</strong></div>
      <div className="product-preview__body">
        <p className="section-kicker text-sunset-300">Do this next</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_.65fr]">
          <div>
            <h3 className="text-2xl font-bold text-white">Review three nearby roles</h3>
            <p className="mt-2 text-sm leading-relaxed text-teal-100">Ranked across the full search—not only the first page—and paired with the evidence behind each fit estimate.</p>
          </div>
          <div className="border border-sunset-300/60 p-4">
            <p className="text-xs uppercase tracking-[.18em] text-sunset-200">Strong fit</p>
            <p className="mt-2 text-lg font-semibold">Warehouse associate</p>
            <p className="mt-1 text-xs text-teal-100">8 miles · posted today</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-3 border-t border-white/15 pt-5 text-xs text-teal-100">
          <span>Evidence visible</span><span>Barriers named</span><span>Next action clear</span>
        </div>
      </div>
    </div>
  );
}

function Constellation() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-65" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="rgba(67,173,165,.48)" strokeWidth="1">
        <path d="M-40 690 C190 590 280 740 470 620 S790 360 980 430 S1240 660 1650 370" />
        <path d="M970 40 C1050 170 1180 180 1260 280 S1380 520 1580 490" stroke="rgba(173,226,221,.32)" />
      </g>
      {[[142,646],[466,621],[780,477],[980,430],[1255,565],[1518,417],[1085,154],[1260,280]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#ff7a3d" />)}
    </svg>
  );
}
