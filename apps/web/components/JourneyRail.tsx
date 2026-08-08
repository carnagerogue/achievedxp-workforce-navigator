import Link from 'next/link';

const PHASES = [
  { key: 'start', n: '01', label: 'Start', href: '/onboarding' },
  { key: 'plan', n: '02', label: 'Plan', href: '/plan' },
  { key: 'prepare', n: '03', label: 'Prepare', href: '/apply-kit' },
  { key: 'work', n: '04', label: 'Find work', href: '/jobs' },
] as const;

export function JourneyRail({ active }: { active?: typeof PHASES[number]['key'] }) {
  return (
    <nav className="journey-rail mb-8 grid grid-cols-2 border border-navy-900/15 bg-teal-50 sm:grid-cols-4" aria-label="Navigator phases">
      {PHASES.map((phase) => {
        const current = phase.key === active;
        return (
          <Link key={phase.key} href={phase.href} aria-current={current ? 'step' : undefined}
            className={'relative flex items-center gap-2 border-b border-r border-navy-900/15 px-3 py-3 text-xs uppercase tracking-[.11em] transition sm:border-b-0 ' +
              (current ? 'bg-navy-900 font-bold text-white' : 'font-semibold text-navy-800 hover:bg-white/70')}>
            <span className={current ? 'text-sunset-300' : 'text-teal-600'}>{phase.n}</span>{phase.label}
            {current ? <span className="absolute inset-x-0 -bottom-px h-[2px] bg-sunset-500" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
