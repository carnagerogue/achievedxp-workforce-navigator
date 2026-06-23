'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy, Phone, MessageSquare, MapPin, FileText, Mail, ExternalLink, HeartHandshake,
  Utensils, Home, Wallet, Scale, Briefcase, Baby, Wifi, Shield, HeartPulse,
} from 'lucide-react';
import {
  NEED_META, CRISIS_LINES, RESOURCE_KIND_LABEL, resourcesFor,
  type ResourceNeed, type FreeResource,
} from '../../lib/free-resources';

const NEED_ICON: Record<ResourceNeed, typeof Phone> = {
  crisis: HeartHandshake, health: HeartPulse, food: Utensils, housing: Home, money: Wallet,
  legal: Scale, work: Briefcase, family: Baby, connectivity: Wifi, veterans: Shield,
};

const NEED_ORDER: ResourceNeed[] = ['crisis', 'health', 'food', 'housing', 'money', 'legal', 'work', 'family', 'connectivity', 'veterans'];

const isInternal = (url?: string) => !!url && url.startsWith('/');

export default function ResourcesPage() {
  const [active, setActive] = useState<ResourceNeed | 'all'>('all');
  const needs = active === 'all' ? NEED_ORDER : [active];

  return (
    <div className="animate-fade-in mx-auto max-w-4xl">
      {/* Header */}
      <header className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-7 shadow-card sm:p-9">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <LifeBuoy className="h-3.5 w-3.5" /> Free help &amp; hotlines
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Help is here — all of it free.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Every line and program below is free to you and needs no account. Tap to call, text, or find help near you.
          When you&apos;re not sure where to start, <span className="font-semibold text-navy-900">dial 211</span> — one call connects
          you to almost anything local.
        </p>
      </header>

      {/* Always-visible crisis strip */}
      <section className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
          <HeartHandshake className="h-3.5 w-3.5" /> If you&apos;re struggling right now
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {CRISIS_LINES.map((r) => (
            <a key={r.id} href={r.phone ? `tel:${r.phone}` : undefined}
              className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-white p-3 transition hover:border-rose-400 hover:shadow-sm">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                {r.text && !r.phone ? <MessageSquare className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-navy-900">{r.name}</span>
                <span className="block text-[11px] text-slate-500">{r.phoneLabel ?? r.text}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Need filter */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        <FilterChip label="All help" active={active === 'all'} onClick={() => setActive('all')} />
        {NEED_ORDER.map((n) => (
          <FilterChip key={n} label={NEED_META[n].label} active={active === n} onClick={() => setActive(n)} />
        ))}
      </div>

      {/* Grouped resources */}
      <div className="mt-5 space-y-5">
        {needs.map((need) => {
          const list = resourcesFor(need);
          if (list.length === 0) return null;
          const Icon = NEED_ICON[need];
          return (
            <section key={need} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-4 w-4" /></span>
                <div>
                  <h2 className="text-base font-bold text-navy-900">{NEED_META[need].label}</h2>
                  <p className="text-xs text-slate-500">{NEED_META[need].blurb}</p>
                </div>
              </div>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {list.map((r) => <ResourceCard key={r.id} r={r} />)}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-xs text-slate-600">
        These are public, free resources from federal agencies and trusted national nonprofits. We don&apos;t share your
        information with them — you reach out directly. Looking for a guided plan?{' '}
        <Link href="/start" className="font-semibold text-teal-700 hover:underline">Start with your reentry compass</Link>.
      </footer>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={'rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ' +
        (active ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-600 ring-slate-300 hover:ring-teal-400 hover:text-teal-700')}>
      {label}
    </button>
  );
}

function KindIcon({ r }: { r: FreeResource }) {
  const Icon = r.kind === 'hotline' ? Phone : r.kind === 'text' ? MessageSquare : r.kind === 'mail' ? Mail : r.kind === 'program' ? FileText : MapPin;
  return <Icon className="h-3.5 w-3.5" />;
}

function ResourceCard({ r }: { r: FreeResource }) {
  // Primary action: call if there's a phone, else open the link.
  const href = r.phone ? `tel:${r.phone}` : r.url;
  const actionLabel = r.phone ? (r.phoneLabel ?? 'Call') : RESOURCE_KIND_LABEL[r.kind];
  const internal = isInternal(r.url) && !r.phone;

  return (
    <li className="flex flex-col rounded-xl border border-slate-200 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy-900">{r.name}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"><KindIcon r={r} /> {RESOURCE_KIND_LABEL[r.kind]}</span>
      </div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{r.desc}</p>
      {r.caveat && <p className="mt-1.5 text-[11px] italic text-amber-700">{r.caveat}</p>}
      <p className="mt-1.5 text-[10px] text-slate-400">{r.source}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {internal ? (
          <Link href={r.url!} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
            {actionLabel}
          </Link>
        ) : href ? (
          <a href={href} target={r.phone ? undefined : '_blank'} rel={r.phone ? undefined : 'noopener noreferrer'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
            {r.phone ? <Phone className="h-3.5 w-3.5" /> : null} {actionLabel} {!r.phone && <ExternalLink className="h-3 w-3" />}
          </a>
        ) : null}
        {r.text && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">
            <MessageSquare className="h-3 w-3" /> {r.text}
          </span>
        )}
      </div>
    </li>
  );
}
