'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HandCoins, ArrowRight, ArrowLeft, Check, ExternalLink, RotateCcw, ShieldCheck, Info,
} from 'lucide-react';
import {
  screenBenefits, pctOfFpl, FPL_YEAR, LIKELIHOOD_META,
  type BenefitInput, type BenefitResult,
} from '../../lib/benefits';
import { AddToPlanButton } from '../../components/AddToPlanButton';

const TONE_CARD: Record<string, string> = {
  good: 'border-teal-200 bg-teal-50/50',
  maybe: 'border-amber-200 bg-amber-50/50',
  low: 'border-slate-200 bg-white',
  info: 'border-sky-200 bg-sky-50/40',
};
const TONE_PILL: Record<string, string> = {
  good: 'bg-teal-100 text-teal-700',
  maybe: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
  info: 'bg-sky-100 text-sky-700',
};

export default function BenefitsPage() {
  const [step, setStep] = useState(0); // 0 household, 1 income, 2 about, 3 results
  const [householdSize, setHouseholdSize] = useState(1);
  const [monthlyIncome, setMonthlyIncome] = useState<string>('');
  const [flags, setFlags] = useState({ pregnantOrYoungKids: false, seniorOrDisabled: false, recentlyIncarcerated: false, owesChildSupport: false });

  const input: BenefitInput = {
    householdSize,
    monthlyIncome: Math.max(0, Math.round(Number(monthlyIncome) || 0)),
    ...flags,
  };
  const results = step === 3 ? screenBenefits(input) : [];
  const reset = () => { setStep(0); setHouseholdSize(1); setMonthlyIncome(''); setFlags({ pregnantOrYoungKids: false, seniorOrDisabled: false, recentlyIncarcerated: false, owesChildSupport: false }); };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <header className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-7 shadow-card sm:p-9">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <HandCoins className="h-3.5 w-3.5" /> Benefits checkup
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">What help can you get?</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Answer three quick questions and we’ll estimate which free programs you likely qualify for — food, health
          coverage, help with bills, and more. Takes about a minute.
        </p>
      </header>

      {step < 3 && (
        <div className="mt-4 flex items-center gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className={'h-1.5 flex-1 rounded-full ' + (s <= step ? 'bg-teal-500' : 'bg-slate-200')} />
          ))}
        </div>
      )}

      {/* Step 0 — household */}
      {step === 0 && (
        <Card>
          <Q>How many people live in your household, counting you?</Q>
          <p className="mt-1 text-xs text-slate-500">Include anyone you buy and cook food with.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setHouseholdSize(n)} aria-pressed={householdSize === n} aria-label={`${n === 6 ? '6 or more' : n} people in household`}
                className={'h-12 w-12 rounded-xl text-base font-bold ring-1 ring-inset transition ' + (householdSize === n ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-700 ring-slate-300 hover:ring-teal-400')}>
                {n}{n === 6 ? '+' : ''}
              </button>
            ))}
          </div>
          {householdSize > 6 && <p className="mt-2 text-xs text-slate-500">Using {householdSize} people.</p>}
          <Nav onNext={() => setStep(1)} />
        </Card>
      )}

      {/* Step 1 — income */}
      {step === 1 && (
        <Card>
          <Q>About how much money comes in each month, before taxes?</Q>
          <p className="mt-1 text-xs text-slate-500">Your best guess is fine. If none right now, leave it at 0.</p>
          <div className="mt-4 inline-flex items-center rounded-xl border border-slate-300 bg-white pl-3">
            <span className="text-lg text-slate-400">$</span>
            <input
              autoFocus type="number" min="0" inputMode="numeric"
              aria-label="Monthly household income before taxes"
              value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setStep(2); }}
              placeholder="0"
              className="w-40 rounded-xl px-2 py-2.5 text-lg focus:outline-none"
            />
            <span className="px-3 text-sm text-slate-400">/ month</span>
          </div>
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </Card>
      )}

      {/* Step 2 — about you */}
      {step === 2 && (
        <Card>
          <Q>Do any of these apply? (optional)</Q>
          <p className="mt-1 text-xs text-slate-500">These help us check a few extra programs. Tap any that fit.</p>
          <div className="mt-4 space-y-2">
            <CheckRow label="I’m pregnant or have kids under 5" on={flags.pregnantOrYoungKids} onToggle={() => setFlags((f) => ({ ...f, pregnantOrYoungKids: !f.pregnantOrYoungKids }))} />
            <CheckRow label="I’m 60+ or have a disability" on={flags.seniorOrDisabled} onToggle={() => setFlags((f) => ({ ...f, seniorOrDisabled: !f.seniorOrDisabled }))} />
            <CheckRow label="I just got out (or I’m still inside)" on={flags.recentlyIncarcerated} onToggle={() => setFlags((f) => ({ ...f, recentlyIncarcerated: !f.recentlyIncarcerated }))} />
            <CheckRow label="I owe child support" on={flags.owesChildSupport} onToggle={() => setFlags((f) => ({ ...f, owesChildSupport: !f.owesChildSupport }))} />
          </div>
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="See my results" />
        </Card>
      )}

      {/* Step 3 — results */}
      {step === 3 && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-card">
            <h2 className="text-lg font-bold text-navy-900">Programs to look into</h2>
            <p className="mt-1 text-sm text-slate-600">
              Based on {input.householdSize} {input.householdSize === 1 ? 'person' : 'people'} and about {input.monthlyIncome > 0 ? `$${input.monthlyIncome.toLocaleString()}/month` : 'no income right now'}
              {' '}({pctOfFpl(input)}% of the {FPL_YEAR} federal poverty level).
            </p>
            <button onClick={reset} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"><RotateCcw className="h-3.5 w-3.5" /> Start over</button>
          </div>

          {results.length > 0 ? (
            <ul className="space-y-2.5">
              {results.map((r) => <ResultCard key={r.id} r={r} />)}
            </ul>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-card">
              <p className="text-sm font-semibold text-navy-900">Let’s find the right help another way</p>
              <p className="mt-1 text-sm text-slate-600">Dial <a href="tel:211" className="font-semibold text-teal-700">211</a> for free, or browse local programs.</p>
              <Link href="/resources?need=money" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">See free help</Link>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs leading-relaxed text-slate-600">
            <p className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><Info className="h-3.5 w-3.5" /> This is an estimate, not a decision.</p>
            <p className="mt-1">
              It uses {FPL_YEAR} federal guidelines, but every state is different and only the agency can say for sure.
              The only way to know is to apply — and <strong>applying is always free</strong>. Need a hand?{' '}
              <Link href="/resources?need=money" className="font-semibold text-teal-700 hover:underline">See free help</Link> or dial 211.
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 mb-2 text-center text-[11px] text-slate-400">Saved only in this browser. Nothing is sent to benefits agencies.</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">{children}</section>;
}
function Q({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-navy-900">{children}</h2>;
}
function Nav({ onBack, onNext, nextLabel = 'Next' }: { onBack?: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-2">
      {onBack ? (
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Back</button>
      ) : <span />}
      <button onClick={onNext} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">{nextLabel} <ArrowRight className="h-4 w-4" /></button>
    </div>
  );
}
function CheckRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={on} className={'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ' + (on ? 'border-teal-400 bg-teal-50/60' : 'border-slate-200 bg-white hover:border-teal-300')}>
      <span className={'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ' + (on ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 bg-white text-transparent')}><Check className="h-3.5 w-3.5" /></span>
      <span className="text-sm font-medium text-navy-900">{label}</span>
    </button>
  );
}

function ResultCard({ r }: { r: BenefitResult }) {
  const meta = LIKELIHOOD_META[r.likelihood];
  return (
    <li className={'rounded-xl border p-4 shadow-card ' + TONE_CARD[meta.tone]}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-navy-900">{r.name}</h3>
        <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' + TONE_PILL[meta.tone]}>{meta.label}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{r.reason}</p>
      {r.reentryNote && (
        <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] leading-snug text-slate-600 ring-1 ring-inset ring-slate-200">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-teal-600" /> {r.reentryNote}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <a href={r.apply.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
          {r.apply.label} <ExternalLink className="h-3 w-3" />
        </a>
        <AddToPlanButton item={{
          id: `benefit-${r.id}`,
          name: `Apply for ${r.name}`,
          type: 'Benefit application',
          category: 'Money & benefits',
          url: r.apply.url,
        }} />
      </div>
    </li>
  );
}
