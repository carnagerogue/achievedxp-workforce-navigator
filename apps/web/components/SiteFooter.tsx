import Link from 'next/link';
import { Shield, Scale, HeartHandshake } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal-50 p-2 text-teal-700"><Shield className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Your data stays yours</p>
              <p className="mt-0.5 text-xs text-slate-600">Background details never reach employers.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal-50 p-2 text-teal-700"><Scale className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Rule-based scoring</p>
              <p className="mt-0.5 text-xs text-slate-600">Every match is explainable — no black box.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal-50 p-2 text-teal-700"><HeartHandshake className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Built for fair-chance hiring</p>
              <p className="mt-0.5 text-xs text-slate-600">Designed with caseworkers and jobseekers in mind.</p>
            </div>
          </div>
        </div>
        <nav className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-200 pt-6 text-xs text-slate-600 sm:grid-cols-4">
          {[
            { href: '/start', label: 'Start here' },
            { href: '/jobs', label: 'Browse jobs' },
            { href: '/apprenticeships', label: 'Apprenticeships' },
            { href: '/entrepreneurship', label: 'Be your own boss' },
            { href: '/resources', label: 'Free help & hotlines' },
            { href: '/benefits', label: 'Benefits checkup' },
            { href: '/local-help', label: 'Local help' },
            { href: '/dashboard', label: 'Dashboard' },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-teal-700">{l.label}</Link>
          ))}
        </nav>
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">© {new Date().getFullYear()} Achieve DXP. Workforce Navigator.</p>
      </div>
    </footer>
  );
}
