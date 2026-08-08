import Link from 'next/link';
import { ArrowUpRight, Scale, Shield, Waypoints } from 'lucide-react';

const LINKS = [
  ['/dashboard', 'Your next step'], ['/plan', 'My plan'], ['/jobs', 'Find a job'],
  ['/apply-kit', 'Apply Kit'], ['/apprenticeships', 'Apprenticeships'], ['/assessment', 'Career quiz'],
  ['/resources', 'Free help'], ['/benefits', 'Benefits checkup'], ['/local-help', 'Local help'],
  ['/caseworker', 'For caseworkers'],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-white/15 bg-navy-900 text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <div className="grid gap-10 border-b border-white/15 pb-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="section-kicker text-sunset-300">Achieve DXP</p>
            <p className="mt-4 max-w-sm font-display text-4xl font-black uppercase leading-[.9]">A clearer route forward.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Promise Icon={Shield} title="Private by default">Your personal details stay in your workspace until you choose to share.</Promise>
            <Promise Icon={Scale} title="Evidence, not mystery">Every fit signal can be inspected.</Promise>
            <Promise Icon={Waypoints} title="One useful action">The full path stays visible.</Promise>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 py-9 text-xs text-teal-100 sm:grid-cols-5" aria-label="Footer navigation">
          {LINKS.map(([href, label]) => <Link key={href} href={href} className="inline-flex items-center gap-1 hover:text-sunset-300">{label}<ArrowUpRight className="h-3 w-3" /></Link>)}
        </nav>
        <div className="flex flex-wrap justify-between gap-2 border-t border-white/15 pt-5 text-[11px] text-navy-300">
          <span>© {new Date().getFullYear()} Achieve DXP · Workforce Navigator</span>
          <span>Guidance, not an employer decision.</span>
        </div>
      </div>
    </footer>
  );
}

function Promise({ Icon, title, children }: { Icon: typeof Shield; title: string; children: React.ReactNode }) {
  return <div className="border-t border-white/15 pt-4"><Icon className="h-5 w-5 text-sunset-300" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-teal-200">{children}</p></div>;
}
