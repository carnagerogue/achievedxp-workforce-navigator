import Link from 'next/link';
import { ArrowRight, Check, Compass, MapPin, ShieldCheck } from 'lucide-react';
import { AUTH_ENABLED } from '../lib/auth-config';
import { LandingScrollEffects } from '../components/LandingScrollEffects';

const STEPS = [
  { n: '01', title: 'Start', copy: 'Tell us what matters right now. Skip anything you are not ready to share.' },
  { n: '02', title: 'Plan', copy: 'Turn housing, documents, supervision, training, and work into one clear sequence.' },
  { n: '03', title: 'Prepare', copy: 'Build the skills, story, and application pieces that strengthen your next move.' },
  { n: '04', title: 'Find work', copy: 'Search real openings, with fit signals and possible barriers explained.' },
];

const RIDE_SCENES = [
  {
    eyebrow: 'Start with what matters',
    lead: 'One clear',
    accent: 'next step.',
    copy: 'Begin with the need that matters today. Share only what you are ready to share, and keep the whole route visible.',
  },
  {
    eyebrow: 'Turn pressure into a sequence',
    lead: 'Put life',
    accent: 'in order.',
    copy: 'Housing, documents, supervision, training, and work settle into one practical plan—without hiding how the order was chosen.',
  },
  {
    eyebrow: 'Build momentum before applying',
    lead: 'Prepare the',
    accent: 'right pieces.',
    copy: 'Strengthen your story, skills, and application materials while the next useful action comes into focus.',
  },
  {
    eyebrow: 'Move toward work that fits',
    lead: 'See the path',
    accent: 'open up.',
    copy: 'Explore real nearby roles with fit evidence, possible barriers, and a clear action you can take next.',
  },
] as const;

export default function LandingPage() {
  const primaryHref = AUTH_ENABLED ? '/sign-up' : '/dashboard';
  const secondaryHref = AUTH_ENABLED ? '/sign-in' : '/jobs';

  return (
    <div className="landing-constellation full-bleed -mt-10 overflow-x-clip text-white" data-landing-scroll>
      <LandingScrollEffects />
      <JourneyField />
      <section className="constellation-hero ride-hero motion-chapter relative border-b border-white/15" data-scroll-hero data-motion-phase="1">
        <div className="ride-hero__sticky px-5 sm:px-10 lg:px-16">
          <div className="ride-tunnel" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="ride-horizon" aria-hidden="true"><span /></div>
          <div className="relative z-10 mx-auto grid h-full max-w-[1500px] gap-10 lg:grid-cols-[1.16fr_.84fr] lg:items-center">
            <div className="ride-stage">
              {RIDE_SCENES.map((scene, index) => {
                const Heading = index === 0 ? 'h1' : 'h2';
                return (
                  <article key={scene.eyebrow} className={'ride-scene ' + (index === 0 ? 'is-current' : '')} data-ride-scene>
                    <p className="ride-scene__count"><span>{String(index + 1).padStart(2, '0')}</span> / 04</p>
                    <p className="section-kicker text-sunset-300">{scene.eyebrow}</p>
                    <Heading className="ride-scene__title mt-6">
                      <span>{scene.lead}</span>
                      <strong>{scene.accent}</strong>
                    </Heading>
                    <p className="ride-scene__copy mt-8">{scene.copy}</p>
                    {index === 0 ? (
                      <div className="mt-9 flex flex-wrap gap-3">
                        <Link href={primaryHref} className="signal-button group">
                          {AUTH_ENABLED ? 'Create your account' : 'Open my navigator'}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link href={secondaryHref} className="signal-button signal-button--ghost">
                          {AUTH_ENABLED ? 'Sign in' : 'Browse jobs first'}
                        </Link>
                      </div>
                    ) : null}
                    {index === RIDE_SCENES.length - 1 ? (
                      <Link href={primaryHref} className="ride-scene__continue mt-9 inline-flex items-center gap-3">
                        Continue into the navigator <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <ol className="journey-path" aria-label="How the navigator works">
              {STEPS.map((step, index) => (
                <li key={step.n} className={'journey-node ' + (index === 0 ? 'is-current is-reached' : '')} data-ride-node>
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
          <div className="scroll-cue" aria-hidden="true"><span>Keep scrolling to follow the route</span><i /></div>
        </div>
      </section>

      <RouteTicker />

      <section className="motion-chapter journey-section journey-section--phases px-5 py-20 sm:px-10 lg:px-16 lg:py-28" data-motion-phase="2">
        <span className="chapter-number" aria-hidden="true">02</span>
        <div className="relative z-10 mx-auto max-w-[1500px]">
          <div className="scroll-stage grid gap-12 border-y border-white/15 py-12 lg:grid-cols-[.7fr_1.3fr] lg:items-end" data-scroll-stage>
            <div data-reveal="left">
              <p className="section-kicker text-sunset-300">Your route, not a maze</p>
              <h2 className="mt-5 font-display text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[.82] tracking-[-.04em]">
                Four phases.<br /><span className="text-teal-300">One open path.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-teal-100 lg:justify-self-end" data-reveal="right">
              The navigator keeps the whole journey visible while highlighting only the next useful action. Nothing is hidden behind a score: you can see the evidence, the uncertainty, and what to do next.
            </p>
          </div>

          <div className="phase-grid mt-16">
            {STEPS.slice(0, 3).map((step) => (
              <article key={step.n} data-reveal="card" style={{ '--reveal-delay': `${indexDelay(step.n)}ms` } as React.CSSProperties}>
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RouteTicker reverse />

      <section className="product-constellation motion-chapter px-5 py-20 sm:px-10 lg:px-16 lg:py-28" data-motion-phase="3">
        <span className="chapter-number chapter-number--left" aria-hidden="true">03</span>
        <div className="scroll-stage relative z-10 mx-auto grid max-w-[1500px] gap-14 lg:grid-cols-[.75fr_1.25fr] lg:items-center" data-scroll-stage>
          <div data-reveal="left">
            <p className="section-kicker text-sunset-300">Explainable by design</p>
            <h2 className="mt-5 font-display text-[clamp(3.2rem,7vw,7.2rem)] font-black uppercase leading-[.8] tracking-[-.04em]">
              See why.<br /><span className="display-outline display-outline--small">Choose clearly.</span>
            </h2>
            <ul className="mt-10 space-y-4 text-teal-100" data-reveal="rise" style={{ '--reveal-delay': '140ms' } as React.CSSProperties}>
              <Promise Icon={ShieldCheck}>Your personal details stay private until you choose to share.</Promise>
              <Promise Icon={Compass}>Every recommendation includes a practical next action.</Promise>
              <Promise Icon={MapPin}>Local help and distance filters use real locations.</Promise>
            </ul>
          </div>
          <div data-reveal="preview"><ProductPreview /></div>
        </div>
      </section>

      <section className="closing-chapter motion-chapter bg-sunset-500 px-5 py-20 text-navy-900 sm:px-10 lg:px-16 lg:py-28" data-motion-phase="4">
        <span className="chapter-number chapter-number--closing" aria-hidden="true">04</span>
        <div className="scroll-stage relative z-10 mx-auto flex max-w-[1500px] flex-col items-start justify-between gap-8 border-y border-navy-900/35 py-10 lg:flex-row lg:items-center" data-scroll-stage>
          <h2 className="closing-title font-display text-[clamp(3.8rem,9vw,9rem)] font-black uppercase leading-[.75] tracking-[-.04em]" data-reveal="left">Begin here.</h2>
          <Link href={primaryHref} className="signal-button !border-navy-900 !bg-navy-900 !text-white" data-reveal="right">
            {AUTH_ENABLED ? 'Create your account' : 'Show my next step'} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function indexDelay(stepNumber: string) {
  return (Number(stepNumber) - 1) * 110;
}

function RouteTicker({ reverse = false }: { reverse?: boolean }) {
  const words = ['Start', 'Stabilize', 'Plan', 'Prepare', 'Find work', 'Move forward'];
  return (
    <div className={'route-ticker ' + (reverse ? 'route-ticker--reverse' : '')} aria-hidden="true">
      <div className="route-ticker__track">
        {[...words, ...words, ...words].map((word, index) => (
          <span key={`${word}-${index}`}>{word}<i /></span>
        ))}
      </div>
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

function JourneyField() {
  const nodes = [
    [92,690],[176,624],[276,662],[352,574],[464,602],[548,516],[632,420],[724,330],[812,356],[918,404],
    [1018,458],[1118,518],[1224,478],[1328,392],[1448,232],[214,248],[314,310],[438,214],[572,278],[704,164],
    [864,218],[1004,164],[1148,244],[1274,188],[1382,124],[1510,168],[124,420],[244,470],[402,422],[1180,674],
  ];
  return (
    <div className="journey-field" aria-hidden="true">
      <div className="journey-field__sticky">
        <div className="journey-field__glow" />
        <div className="journey-field__scene">
          <svg className="h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
            <g className="journey-field__web" fill="none" stroke="rgba(173,226,221,.24)" strokeWidth="1">
              <path d="M-40 742 L92 690 L176 624 L276 662 L352 574 L464 602 L548 516 L632 420 L724 330 L812 356" />
              <path d="M214 248 L314 310 L438 214 L572 278 L704 164 L864 218 L1004 164 L1148 244 L1274 188 L1382 124 L1510 168" />
              <path d="M124 420 L244 470 L402 422 L548 516 L724 330 L918 404 L1018 458 L1118 518 L1224 478 L1328 392 L1448 232" />
              <path d="M92 690 L244 470 M176 624 L402 422 M276 662 L548 516 M464 602 L632 420 M572 278 L812 356 M704 164 L918 404 M864 218 L1018 458 M1004 164 L1224 478 M1148 244 L1328 392 M1274 188 L1448 232" />
              <path d="M548 516 L438 214 M724 330 L572 278 M918 404 L864 218 M1118 518 L1148 244 M1224 478 L1382 124" />
            </g>
            <path data-route-master className="journey-field__route" d="M 92 690 C 260 548 360 666 548 516 S 742 252 918 404 S 1188 602 1448 232" />
            <g className="journey-field__nodes">
              {nodes.map(([cx, cy], index) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index % 6 === 0 ? 5 : index % 3 === 0 ? 3 : 2} />)}
            </g>
            <g className="journey-field__labels">
              <text x="76" y="752">START · WHAT MATTERS NOW</text>
              <text x="500" y="476">PLAN · ONE CLEAR ORDER</text>
              <text x="910" y="372">PREPARE · BUILD THE PIECES</text>
              <text x="1290" y="205">WORK · MOVE FORWARD</text>
            </g>
            <g data-route-traveler className="journey-field__traveler">
              <circle className="journey-field__traveler-halo" r="24" />
              <circle className="journey-field__traveler-core" r="6" />
              <path d="M-2 -2 L8 0 L-2 2 Z" />
            </g>
          </svg>
        </div>
        <div className="journey-field__phase">
          <span data-field-phase="1">START</span>
          <span data-field-phase="2">PLAN</span>
          <span data-field-phase="3">PREPARE</span>
          <span data-field-phase="4">WORK</span>
        </div>
      </div>
    </div>
  );
}
