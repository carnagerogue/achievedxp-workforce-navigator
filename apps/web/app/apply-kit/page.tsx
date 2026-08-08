'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Trash2, Check, ArrowRight, Sparkles } from 'lucide-react';
import {
  useApplyKit, patchApplyKit, addReference, removeReference,
  addAnswer, updateAnswer, removeAnswer, kitCompleteness,
  type ShiftPref,
} from '../../lib/apply-kit';
import { getLocalProfile } from '../../lib/local-profile';
import { Skeleton } from '../../components/Skeleton';

const SHIFTS: { value: ShiftPref; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'nights', label: 'Nights' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'overnight', label: 'Overnight' },
  { value: 'any', label: 'Any shift' },
];

export default function ApplyKitPage() {
  const kit = useApplyKit();
  const [hydrated, setHydrated] = useState(false);
  const pct = kitCompleteness(kit);

  // Prefill the obvious fields from the saved profile the first time, so the
  // kit starts filled instead of blank — never overwrite what they've typed.
  useEffect(() => {
    const p = getLocalProfile();
    if (!p) { setHydrated(true); return; }
    const patch: Record<string, string> = {};
    if (!kit.fullName && p.displayName) patch.fullName = p.displayName;
    if (!kit.email && p.email) patch.email = p.email;
    if (!kit.cityState && (p.locationCity || p.locationRegion)) {
      patch.cityState = [p.locationCity, p.locationRegion].filter(Boolean).join(', ');
    }
    if (kit.hasTransportation === null && typeof p.hasTransportation === 'boolean') {
      patchApplyKit({ hasTransportation: p.hasTransportation });
    }
    if (Object.keys(patch).length) patchApplyKit(patch);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) return <div aria-busy="true" aria-label="Loading Apply Kit" className="mx-auto max-w-2xl space-y-5"><Skeleton className="h-56 w-full rounded-3xl" /><Skeleton className="h-72 w-full rounded-2xl" /></div>;

  const toggleShift = (s: ShiftPref) => {
    patchApplyKit({ shifts: kit.shifts.includes(s) ? kit.shifts.filter((x) => x !== s) : [...kit.shifts, s] });
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <header className="rounded-3xl border border-slate-900/[0.07] bg-white bg-hero-radial p-8 shadow-card sm:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <FileText className="h-3.5 w-3.5" /> Apply Kit
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Fill it once. Use it everywhere.</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
          The same questions come up on every application. Answer them once here, and every job you
          apply to gets your answers ready to paste — in seconds. Private to you; never sent to
          employers automatically.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-semibold text-slate-600 tabular-nums">{pct}% ready</span>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        <Card title="The basics">
          <Field label="Full name"><Input value={kit.fullName} onChange={(v) => patchApplyKit({ fullName: v })} placeholder="Jordan Smith" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone"><Input value={kit.phone} onChange={(v) => patchApplyKit({ phone: v })} placeholder="(555) 123-4567" /></Field>
            <Field label="Email"><Input value={kit.email} onChange={(v) => patchApplyKit({ email: v })} placeholder="you@email.com" /></Field>
          </div>
          <Field label="City, state"><Input value={kit.cityState} onChange={(v) => patchApplyKit({ cityState: v })} placeholder="Columbus, OH" /></Field>
        </Card>

        <Card title="Availability">
          <Field label="Earliest start date"><Input value={kit.earliestStart} onChange={(v) => patchApplyKit({ earliestStart: v })} placeholder="Right away / a specific date" /></Field>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-700">Shifts I can work</p>
            <div className="flex flex-wrap gap-1.5">
              {SHIFTS.map((s) => {
                const on = kit.shifts.includes(s.value);
                return (
                  <button key={s.value} onClick={() => toggleShift(s.value)} aria-pressed={on}
                    className={'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ' + (on ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-600 ring-slate-300 hover:ring-teal-400')}>
                    {on && <Check className="h-3 w-3" />} {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <YesNo label="Reliable transportation" value={kit.hasTransportation} onChange={(v) => patchApplyKit({ hasTransportation: v })} />
            <YesNo label="Authorized to work in the U.S." value={kit.authorizedToWork} onChange={(v) => patchApplyKit({ authorizedToWork: v })} />
          </div>
        </Card>

        <Card title="Why hire me">
          <Field label="A sentence or two about your strengths">
            <Textarea value={kit.pitch} onChange={(v) => patchApplyKit({ pitch: v })} placeholder="Dependable, show up early, and I learn fast. Two years of warehouse experience and a clean safety record." />
          </Field>
          <Link href="/background-statement" className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:border-teal-400">
            <Sparkles className="h-3.5 w-3.5" /> Need words for talking about your record? Use the statement helper <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {kit.backgroundStatement ? (
            <Field label="Your saved disclosure statement"><Textarea value={kit.backgroundStatement} onChange={(v) => patchApplyKit({ backgroundStatement: v })} /></Field>
          ) : null}
        </Card>

        <Card title="References">
          {kit.references.length > 0 && (
            <ul className="space-y-2">
              {kit.references.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                  <span className="min-w-0 flex-1 text-sm"><span className="font-semibold text-slate-800">{r.name}</span>{r.relationship && <span className="text-slate-400"> · {r.relationship}</span>}{r.phone && <span className="text-slate-400"> · {r.phone}</span>}</span>
                  <button onClick={() => removeReference(r.id)} className="text-slate-300 hover:text-rose-500" aria-label="Remove reference"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <ReferenceAdder />
        </Card>

        <Card title="Reusable answers" subtitle="Save answers to questions employers keep asking, so you never retype them.">
          {kit.answers.length > 0 && (
            <ul className="space-y-3">
              {kit.answers.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <input value={a.question} onChange={(e) => updateAnswer(a.id, { question: e.target.value })} placeholder="Question" className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none" />
                    <button onClick={() => removeAnswer(a.id)} className="shrink-0 text-slate-300 hover:text-rose-500" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <textarea value={a.answer} onChange={(e) => updateAnswer(a.id, { answer: e.target.value })} placeholder="Your answer" rows={2} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => addAnswer({ question: '', answer: '' })} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700"><Plus className="h-4 w-4" /> Add a question &amp; answer</button>
        </Card>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-sm text-slate-600">Saved automatically as you type.</p>
          <Link href="/jobs" className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Find jobs to apply to <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>

      <p className="mb-2 mt-4 text-center text-[11px] text-slate-400">Saved in this browser. Nothing is shared with employers unless you paste it yourself.</p>
    </div>
  );
}

function ReferenceAdder() {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700">
        <Plus className="h-4 w-4" /> Add a reference
      </summary>
      <RefForm />
    </details>
  );
}

function RefForm() {
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const name = (f.elements.namedItem('name') as HTMLInputElement).value.trim();
    if (!name) return;
    addReference({
      name,
      relationship: (f.elements.namedItem('rel') as HTMLInputElement).value.trim() || undefined,
      phone: (f.elements.namedItem('phone') as HTMLInputElement).value.trim() || undefined,
    });
    f.reset();
  };
  return (
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap gap-2">
        <input name="name" placeholder="Name" autoComplete="off" className="min-w-[130px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        <input name="rel" placeholder="Who they are (former boss…)" autoComplete="off" className="min-w-[130px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
      </div>
      <div className="flex flex-wrap gap-2">
        <input name="phone" placeholder="Phone (optional)" autoComplete="off" className="min-w-[130px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        <button type="submit" className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">Add</button>
      </div>
    </form>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>{children}</label>;
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />;
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />;
}
function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="flex gap-1">
        <button onClick={() => onChange(true)} aria-pressed={value === true} aria-label={`${label}: Yes`} className={'rounded-md px-2 py-0.5 text-xs font-semibold ' + (value === true ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500')}>Yes</button>
        <button onClick={() => onChange(false)} aria-pressed={value === false} aria-label={`${label}: No`} className={'rounded-md px-2 py-0.5 text-xs font-semibold ' + (value === false ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500')}>No</button>
      </div>
    </div>
  );
}
