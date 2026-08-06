'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Compass, ShieldAlert, Check, ArrowRight, Phone, Users, Plus, Trash2,
  HeartHandshake, Sparkles, BookOpen, ChevronDown, LifeBuoy, Target, Star,
} from 'lucide-react';
import {
  PHASES, phaseProgress, activePhaseKey, nextStep, overallProgress, inCriticalWindow, EVIDENCE_BASE,
  type JourneyPhase, type JourneyStep, type JourneyAction, type ReentryInputs,
} from '../../lib/reentry-journey';
import {
  useReentryInputs, setReentryInputs, useCompletedSteps, setStepDone, useFutureSelf, setFutureSelf,
} from '../../lib/reentry-store';
import {
  useContacts, addContact, removeContact, markReachedOut, supportCount, staleSupportContacts,
  CONTACT_TAG_LABEL, type Contact, type ContactTag,
} from '../../lib/support-network';
import { PHASE_ACCENT, ActionButton, NextStepHero } from '../../components/journey/NextStepHero';
import { ToolsGrid } from '../../components/ToolsGrid';

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function ReentryCompassPage() {
  const inputs = useReentryInputs();
  const completedArr = useCompletedSteps();
  const completed = new Set(completedArr);
  const contacts = useContacts();
  const futureSelf = useFutureSelf();

  const progress = phaseProgress(inputs, completed);
  const activeKey = activePhaseKey(inputs, completed);
  const next = nextStep(inputs, completed);
  const overall = overallProgress(inputs, completed);
  const critical = inCriticalWindow(inputs);
  const activePhase = PHASES.find((p) => p.key === activeKey)!;

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      {/* Header */}
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
        <div className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-teal-800 px-6 py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_85%_-20%,rgba(45,212,229,0.25),transparent)]" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-200">
              <Compass className="h-4 w-4" /> Your reentry compass
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">One step at a time.</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-teal-50/85">
              Getting out is hard, and you don&apos;t have to figure it all out at once. We&apos;ll walk you
              through what matters most, in the order that research shows works — starting with staying safe and
              steady, then the people around you, then work that lasts.
            </p>
            {overall.total > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/20">
                {overall.done} of {overall.total} steps done · {overall.pct}%
              </p>
            )}
          </div>
        </div>

        <ContextBar inputs={inputs} critical={critical} />
      </header>

      {/* The one thing to do now */}
      {next ? (
        <div className="mt-4"><NextStepHero phase={next.phase} step={next.step} onDone={() => setStepDone(next.step.id, true)} /></div>
      ) : (
        <section className="mt-4 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 text-center shadow-card">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700"><Star className="h-6 w-6" /></span>
          <h2 className="mt-3 text-lg font-bold text-navy-900">You&apos;ve worked every step here.</h2>
          <p className="mt-1 text-sm text-slate-600">That&apos;s real progress. Keep your plan moving and your job steady — and come back any time.</p>
          <Link href="/local-help?tab=checklist" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Open My Plan <ArrowRight className="h-4 w-4" /></Link>
        </section>
      )}

      {/* Phase rail */}
      <PhaseRail progress={progress} activeKey={activeKey} />

      {/* Active phase steps */}
      <PhaseSteps phase={activePhase} inputs={inputs} completed={completed} />

      {/* Your Corner */}
      <CornerSection contacts={contacts} />

      {/* Future self */}
      <FutureSelfSection value={futureSelf} />

      {/* Explore all tools */}
      <div className="mt-4"><ToolsGrid /></div>

      {/* Why this plan */}
      <EvidencePanel />

      <p className="mt-4 mb-2 text-center text-[11px] text-slate-400">Private to this device. You decide what to share.</p>
    </div>
  );
}

// ───────────────────────── Context (responsivity) ─────────────────────────
const RELEASE_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Not out yet', value: null },
  { label: 'This week', value: 3 },
  { label: 'This month', value: 20 },
  { label: 'A few months ago', value: 120 },
  { label: 'Longer ago', value: 400 },
];

function ContextBar({ inputs, critical }: { inputs: ReentryInputs; critical: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = (key: keyof ReentryInputs, val: boolean) => setReentryInputs({ [key]: val } as Partial<ReentryInputs>);
  return (
    <div className="border-t border-slate-100 px-5 py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Sparkles className="h-3.5 w-3.5 text-teal-600" /> A few things help us guide you {critical && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">First months — highest priority</span>}
        </span>
        <ChevronDown className={'h-4 w-4 text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">When did you get out?</p>
            <div className="flex flex-wrap gap-1.5">
              {RELEASE_OPTIONS.map((o) => {
                const on = (inputs.daysSinceRelease ?? undefined) === (o.value ?? undefined);
                return (
                  <button key={o.label} onClick={() => setReentryInputs({ daysSinceRelease: o.value })}
                    className={'rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ' + (on ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-600 ring-slate-300 hover:ring-teal-400')}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <YesChip label="I'm on parole or probation" on={inputs.onSupervision} onToggle={(v) => toggle('onSupervision', v)} />
            <YesChip label="People depend on me" on={inputs.hasDependents} onToggle={(v) => toggle('hasDependents', v)} />
            <YesChip label="I have a safe place to stay" on={inputs.housingSecure} onToggle={(v) => toggle('housingSecure', v)} />
            <YesChip label="I've struggled with opioids" on={inputs.opioidHistory} onToggle={(v) => toggle('opioidHistory', v)} />
          </div>
          <p className="text-[11px] text-slate-400">This stays on your device and only shapes which steps we show first.</p>
        </div>
      )}
    </div>
  );
}

function YesChip({ label, on, onToggle }: { label: string; on?: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button onClick={() => onToggle(!on)}
      className={'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ' + (on ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-600 ring-slate-300 hover:ring-teal-400')}>
      {on && <Check className="h-3 w-3" />} {label}
    </button>
  );
}

// ───────────────────────── Phase rail ─────────────────────────
function PhaseRail({ progress, activeKey }: { progress: ReturnType<typeof phaseProgress>; activeKey: string }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {progress.map(({ phase, done, total, complete }) => {
        const active = phase.key === activeKey;
        return (
          <div key={phase.key} className={'rounded-xl border p-3 ' + (active ? 'border-teal-400 bg-teal-50/50 shadow-sm' : complete ? 'border-teal-200 bg-white' : 'border-slate-200 bg-white')}>
            <div className="flex items-center justify-between">
              <span className={'text-xs font-bold ' + (active ? 'text-teal-800' : 'text-navy-900')}>{phase.title}</span>
              {complete && <Check className="h-3.5 w-3.5 text-teal-600" />}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={'h-full rounded-full bg-gradient-to-r ' + PHASE_ACCENT[phase.key]} style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">{done}/{total} done</p>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── Active phase steps ─────────────────────────
function PhaseSteps({ phase, inputs, completed }: { phase: JourneyPhase; inputs: ReentryInputs; completed: Set<string> }) {
  const steps = phase.steps.filter((s) => (s.appliesIf ? s.appliesIf(inputs) : true));
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-navy-900">{phase.title}</h2>
        <span className="text-xs text-slate-400">{phase.tagline}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{phase.why}</p>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => <StepRow key={s.id} step={s} done={completed.has(s.id)} />)}
      </ul>
    </section>
  );
}

function StepRow({ step, done }: { step: JourneyStep; done: boolean }) {
  const [showWhy, setShowWhy] = useState(false);
  return (
    <li className={'rounded-xl border p-3 ' + (done ? 'border-slate-200 bg-slate-50/60' : step.urgent ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200')}>
      <div className="flex items-start gap-2.5">
        <button onClick={() => setStepDone(step.id, !done)} aria-label={done ? 'Mark not done' : 'Mark done'}
          className={'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ' + (done ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-teal-400')}>
          <Check className="h-3 w-3" />
        </button>
        <div className="min-w-0 flex-1">
          <p className={'text-sm font-semibold text-navy-900 ' + (done ? 'line-through opacity-60' : '')}>
            {step.title}
            {step.urgent && !done && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"><ShieldAlert className="h-2.5 w-2.5" /> Important</span>}
          </p>
          {!done && <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{step.why}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!done && step.action && <ActionButton action={step.action} />}
            <button onClick={() => setShowWhy((v) => !v)} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">
              {showWhy ? 'Hide' : 'Why this matters'}
            </button>
          </div>
          {showWhy && <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] leading-snug text-slate-500">{step.evidence}</p>}
        </div>
      </div>
    </li>
  );
}

// ───────────────────────── Your Corner ─────────────────────────
const TAG_PILL: Record<ContactTag, string> = {
  support: 'bg-teal-50 text-teal-700 ring-teal-200',
  professional: 'bg-sky-50 text-sky-700 ring-sky-200',
  risky: 'bg-amber-50 text-amber-700 ring-amber-200',
};

function CornerSection({ contacts }: { contacts: Contact[] }) {
  const support = supportCount(contacts);
  const stale = staleSupportContacts(contacts);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [rel, setRel] = useState('');
  const [tag, setTag] = useState<ContactTag>('support');
  const [phone, setPhone] = useState('');

  const add = () => {
    const n = name.trim(); if (!n) return;
    addContact({ name: n, relationship: rel.trim() || undefined, tag, phone: phone.trim() || undefined });
    setName(''); setRel(''); setPhone(''); setTag('support'); setAdding(false);
  };

  return (
    <section id="corner" className="mt-4 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-navy-900"><Users className="h-4 w-4 text-teal-600" /> Your corner</h2>
        <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ' + (support > 0 ? 'bg-teal-50 text-teal-700 ring-teal-200' : 'bg-slate-100 text-slate-600 ring-slate-200')}>
          {support > 0 ? `${support} ${support === 1 ? 'person' : 'people'} in your corner` : 'Add your first person'}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        You don&apos;t have to do this alone. Even one or two positive people make a real difference — add who you can lean
        on, and we&apos;ll remind you to keep in touch.
      </p>

      {/* Always-available human help */}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <HelpLink Icon={LifeBuoy} label="Find local help" sub="Call 211" href="tel:211" />
        <HelpLink Icon={HeartHandshake} label="Talk to someone" sub="Call or text 988" href="tel:988" />
        <HelpLink Icon={Phone} label="SAMHSA helpline" sub="1-800-662-4357" href="tel:18006624357" />
      </div>
      <Link href="/resources" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline">
        Browse all free help &amp; hotlines <ArrowRight className="h-3.5 w-3.5" />
      </Link>

      {stale.length > 0 && support > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
          <HeartHandshake className="h-3.5 w-3.5" /> It&apos;s been a while — reach out to {stale.map((c) => c.name).slice(0, 2).join(' or ')} today.
        </p>
      )}

      {contacts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2.5">
              <span className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-navy-900">{c.name}</span>
                {c.relationship && <span className="text-xs text-slate-400"> · {c.relationship}</span>}
              </span>
              <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ' + TAG_PILL[c.tag]}>{CONTACT_TAG_LABEL[c.tag]}</span>
              {c.phone && <a href={`tel:${c.phone.replace(/[^\d]/g, '')}`} onClick={() => markReachedOut(c.id, todayIso())} className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-700"><Phone className="h-3 w-3" /> Call</a>}
              {c.tag === 'support' && <button onClick={() => markReachedOut(c.id, todayIso())} className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700">Reached out</button>}
              <button onClick={() => removeContact(c.id)} className="text-slate-300 hover:text-rose-500" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap gap-2">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="min-w-[140px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
            <input value={rel} onChange={(e) => setRel(e.target.value)} placeholder="Who they are (sister, sponsor…)" className="min-w-[140px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="min-w-[120px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
            <select value={tag} onChange={(e) => setTag(e.target.value as ContactTag)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-teal-500 focus:outline-none">
              {(Object.keys(CONTACT_TAG_LABEL) as ContactTag[]).map((t) => <option key={t} value={t}>{CONTACT_TAG_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">Add to my corner</button>
            <button onClick={() => setAdding(false)} className="px-3 py-2 text-sm font-semibold text-slate-500">Cancel</button>
          </div>
          <p className="text-[11px] text-slate-400">Tagging someone &ldquo;pulls me backward&rdquo; is just for you — we&apos;ll never nudge you toward them.</p>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700"><Plus className="h-4 w-4" /> Add someone</button>
      )}
    </section>
  );
}

function HelpLink({ Icon, label, sub, href }: { Icon: typeof Phone; label: string; sub: string; href: string }) {
  return (
    <a href={href} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-teal-400 hover:shadow-sm">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy-900">{label}</span>
        <span className="block text-[11px] text-slate-500">{sub}</span>
      </span>
    </a>
  );
}

// ───────────────────────── Future self ─────────────────────────
function FutureSelfSection({ value }: { value: string }) {
  const [draft, setDraft] = useState(value);
  return (
    <section id="future-self" className="mt-4 scroll-mt-24 rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50/50 to-white p-5 shadow-card">
      <h2 className="inline-flex items-center gap-2 text-base font-bold text-navy-900"><Target className="h-4 w-4 text-teal-600" /> Who you&apos;re becoming</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        People who can picture a positive future for themselves are far more likely to reach it. In your own words —
        who are you working to become?
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setFutureSelf(draft)}
        rows={2}
        placeholder="e.g. A steady provider for my kids. Someone people can count on."
        className="mt-3 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <p className="mt-2 text-[11px] text-slate-400">Based on desistance research (Maruna, &ldquo;Making Good&rdquo;): a forward identity and hope drive lasting change.</p>
    </section>
  );
}

// ───────────────────────── Evidence panel ─────────────────────────
function EvidencePanel() {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="inline-flex items-center gap-2 text-base font-bold text-navy-900"><BookOpen className="h-4 w-4 text-teal-600" /> Why this plan, in this order</span>
        <ChevronDown className={'h-4 w-4 text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
      </button>
      <p className="mt-1 text-sm text-slate-600">This isn&apos;t guesswork. Every step is based on real reentry research.</p>
      {open && (
        <ul className="mt-3 space-y-2.5">
          {EVIDENCE_BASE.map((e) => (
            <li key={e.source} className="border-l-2 border-teal-200 pl-3">
              <p className="text-sm font-medium text-navy-900">{e.claim}</p>
              <p className="text-[11px] text-slate-500">{e.source}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
