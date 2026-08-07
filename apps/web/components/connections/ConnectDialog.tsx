'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, ShieldCheck, Check, ArrowRight, Lock } from 'lucide-react';
import { connect, type Provider } from '../../lib/connections';

/**
 * The consent gate. Connecting is always: (1) see plainly what it does and does
 * NOT do, (2) go to the provider's own site and sign in there, (3) come back and
 * confirm. We never take a password and never apply for anyone — the dialog is
 * built so that promise is visible at every step.
 */
export function ConnectDialog({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const [step, setStep] = useState<'consent' | 'confirm'>('consent');
  const [handle, setHandle] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isIdentity = provider.category === 'identity';

  const goToProvider = () => {
    window.open(provider.url, '_blank', 'noopener,noreferrer');
    setStep('confirm');
  };

  const finish = () => {
    connect(provider.id, { handle: handle || undefined, connectedAt: Date.now() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Connect ${provider.name}`}>
      <button className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="animate-slide-up relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-pop sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-900/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-white" style={{ backgroundColor: provider.accent }}>
              {provider.name.charAt(0)}
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{provider.name}</h2>
              <p className="text-sm text-slate-500">{provider.blurb}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-900/[0.05] hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        {step === 'consent' ? (
          <div className="space-y-4 p-5">
            {/* Password-safety promise — the single most important line for this population */}
            <div className="flex items-start gap-2.5 rounded-2xl bg-teal-50/70 p-3.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <p className="text-sm text-teal-900">
                {isIdentity
                  ? 'You sign in on their site. We only receive your name and email — never your password.'
                  : 'You sign in on their site. We never see or store your password, and we never apply for you.'}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">What this does</p>
              <ul className="space-y-1.5">
                {provider.does.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /> {d}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">What it never does</p>
              <ul className="space-y-1.5">
                {provider.doesNot.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-slate-500">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {d}
                  </li>
                ))}
              </ul>
            </div>

            <button onClick={goToProvider} className="group flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-teal-700 active:scale-[0.99]">
              Continue to {provider.name} <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-center text-[11px] text-slate-400">Opens {provider.name} in a new tab. Come back here when you&apos;re signed in.</p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <p className="text-sm text-slate-600">
                Signed in on {provider.name}? Link it here so your Apply Kit and tracker know about it.
                You can disconnect any time — it only removes the link on this side.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Email or username you used <span className="font-normal text-slate-400">(optional)</span></span>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="you@email.com" autoComplete="off"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </label>

            <button onClick={finish} className="flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-teal-700 active:scale-[0.99]">
              <Check className="h-4 w-4" /> Link {provider.name}
            </button>
            <button onClick={() => setStep('consent')} className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
              Back <ArrowRight className="h-3 w-3 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
