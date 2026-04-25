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
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Achieve DXP. Workforce Navigator.</p>
          <div className="flex items-center gap-4">
            <Link href="/jobs"       className="hover:text-teal-700">Browse jobs</Link>
            <Link href="/dashboard"  className="hover:text-teal-700">Dashboard</Link>
            <Link href="/onboarding" className="hover:text-teal-700">Profile</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
