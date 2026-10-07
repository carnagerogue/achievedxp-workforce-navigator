'use client';

/**
 * Roadmap building blocks for My plan: the step row, the optional context
 * that tailors which steps appear, Your corner, and the evidence behind the
 * order. The core path is universal; specialized support appears only when
 * someone requests it. All state lives in reentry-store / support-network.
 */
import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, Check, ArrowRight, Phone, Users, Plus, Trash2,
  HeartHandshake, Sparkles, BookOpen, ChevronDown, LifeBuoy,
} from 'lucide-react';
import {
  EVIDENCE_BASE,
  type JourneyStep, type ReentryInputs,
} from '../../lib/reentry-journey';
import { setReentryInputs, setStepDone } from '../../lib/reentry-store';
import {
  addContact, removeContact, markReachedOut, supportCount, staleSupportContacts,
  CONTACT_TAG_LABEL, type Contact, type ContactTag,
} from '../../lib/support-network';
import { ActionButton } from './NextStepHero';

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ───────────────────────── Context (responsivity) ─────────────────────────
const RELEASE_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Not out yet', value: null },
  { label: 'This week', value: 3 },
  { label: 'This month', value: 20 },
  { label: 'A few months ago', value: 120 },
  { label: 'Longer ago', value: 400 },
];

export function ContextBar({ inputs, critical, defaultOpen = false }: { inputs: ReentryInputs; critical: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = (key: keyof ReentryInputs, val: boolean) => setReentryInputs({ [key]: val } as Partial<ReentryInputs>);
  return (
    <div className="border-t border-slate-100 px-5 py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Tailor your roadmap to your situation {critical && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">Time-sensitive support</span>}
        </span>
        <ChevronDown className={'h-4 w-4 text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">What would make work easier right now?</p>
            <div className="flex flex-wrap gap-1.5">
              <YesChip label="I need ID or document help" on={inputs.needsId} onToggle={(v) => toggle('needsId', v)} />
              <YesChip label="I need housing support" on={inputs.housingSecure === false} onToggle={(v) => setReentryInputs({ housingSecure: v ? false : undefined })} />
              <YesChip label="I need medication support" on={inputs.medicationNeeds} onToggle={(v) => toggle('medicationNeeds', v)} />
              <YesChip label="People depend on me" on={inputs.hasDependents} onToggle={(v) => toggle('hasDependents', v)} />
            </div>
          </div>
          {inputs.justiceSupport === true && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Optional background-aware support</p>
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
                <YesChip label="I'm on parole or probation" on={inputs.onSupervision} onToggle={(v) => toggle('onSupervision', v)} />
                <YesChip label="I want opioid-safety resources" on={inputs.opioidHistory} onToggle={(v) => toggle('opioidHistory', v)} />
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-400">These choices stay on your device and only shape which optional steps appear.</p>
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

// ───────────────────────── One roadmap step ─────────────────────────
export function StepRow({ step, done, isNext = false }: { step: JourneyStep; done: boolean; isNext?: boolean }) {
  const [showWhy, setShowWhy] = useState(false);
  return (
    <li className={'rounded-2xl border p-3.5 sm:p-4 ' + (done ? 'border-slate-200 bg-slate-50/60'
      : isNext ? 'border-teal-300 bg-teal-50/50 ring-1 ring-inset ring-teal-200'
      : step.urgent ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white')}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setStepDone(step.id, !done)} aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${step.title}`} aria-pressed={done}
          className={'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ' + (done ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-teal-500 hover:text-teal-300')}>
          <Check className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className={'text-[15px] font-semibold text-navy-900 ' + (done ? 'line-through decoration-slate-400 opacity-60' : '')}>
            {step.title}
            {isNext && !done && <span className="ml-2 inline-flex items-center rounded-full bg-navy-900 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-white">Next</span>}
            {step.urgent && !done && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 align-middle text-[10px] font-bold text-rose-700"><ShieldAlert className="h-2.5 w-2.5" /> Important</span>}
          </p>
          {!done && <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.why}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {!done && step.action && <ActionButton action={step.action} primary={isNext} />}
            <button type="button" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy}
              aria-label={`${showWhy ? 'Hide why this matters for' : 'Why this matters for'}: ${step.title}`}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600">
              {showWhy ? 'Hide' : 'Why this matters'}
            </button>
          </div>
          {showWhy && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-500">{step.evidence}</p>}
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

export function CornerSection({ contacts }: { contacts: Contact[] }) {
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
    <section id="corner" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
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
              <button onClick={() => removeContact(c.id)} className="text-slate-300 hover:text-rose-500" aria-label={`Remove ${c.name} from your corner`}><Trash2 className="h-3.5 w-3.5" /></button>
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

export function HelpLink({ Icon, label, sub, href }: { Icon: typeof Phone; label: string; sub: string; href: string }) {
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

// ───────────────────────── Evidence panel ─────────────────────────
export function EvidencePanel() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="inline-flex items-center gap-2 text-base font-bold text-navy-900"><BookOpen className="h-4 w-4 text-teal-600" /> Why this plan, in this order</span>
        <ChevronDown className={'h-4 w-4 text-slate-400 transition ' + (open ? 'rotate-180' : '')} />
      </button>
      <p className="mt-1 text-sm text-slate-600">This isn&apos;t guesswork. The guidance is grounded in career-development and workforce research.</p>
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
