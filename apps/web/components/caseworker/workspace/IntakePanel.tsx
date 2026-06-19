'use client';

import { useState } from 'react';
import { ChevronDown, Award, Wrench } from 'lucide-react';
import {
  CONVICTION_LABELS, CONVICTION_TYPE_ORDER, USER_CONTEXT_OPTIONS,
  type ConvictionType, type UserContextMode, type EducationLevel,
} from '@dxp/shared';
import {
  BARRIER_LABELS, type Participant, type Barrier, type SupervisionKind,
} from '../../../lib/caseworker-store';
import {
  SKILL_CATEGORIES, SKILL_INDEX, CERT_CATEGORIES, CERT_INDEX, labelFor,
  type CatalogItem,
} from '../../../lib/catalogs';
import { RichChipPicker } from '../../RichChipPicker';
import { Field, TextInput, Select } from '../fields';

const EDUCATION_OPTIONS: [EducationLevel, string][] = [
  ['unknown', 'Not specified'],
  ['less_than_high_school', 'Less than high school'],
  ['high_school_or_ged', 'High school / GED'],
  ['some_college', 'Some college'],
  ['associate', 'Associate degree'],
  ['bachelor', "Bachelor's degree"],
  ['graduate', 'Graduate degree'],
];
const SUPERVISION_OPTIONS: [SupervisionKind, string][] = [
  ['none', 'None'], ['parole', 'Parole'], ['probation', 'Probation'], ['parole_and_probation', 'Parole + probation'],
];
const ALL_BARRIERS = Object.keys(BARRIER_LABELS) as Barrier[];

export function IntakePanel({
  draft, set, toggleBarrier,
}: {
  draft: Participant;
  set: <K extends keyof Participant>(k: K, v: Participant[K]) => void;
  toggleBarrier: (b: Barrier) => void;
}) {
  const toggleIn = (key: 'skills' | 'certifications', code: string) =>
    set(key, draft[key].includes(code) ? draft[key].filter((x) => x !== code) : [...draft[key], code]);

  return (
    <section id="intake" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-base font-semibold text-navy-900">Profile</h2>
      <p className="mt-0.5 text-xs text-slate-500">Edits save automatically.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Participant name"><TextInput value={draft.name} onChange={(v) => set('name', v)} placeholder="First or initials" /></Field>
        <Field label="Primary conviction">
          <Select value={draft.conviction} onChange={(v) => set('conviction', v as ConvictionType)}>
            {CONVICTION_TYPE_ORDER.map((c) => <option key={c} value={c}>{CONVICTION_LABELS[c]}</option>)}
          </Select>
        </Field>
        <Field label="Where they are now">
          <Select value={draft.contextMode} onChange={(v) => set('contextMode', v as UserContextMode)}>
            {USER_CONTEXT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Supervision">
          <Select value={draft.supervision} onChange={(v) => set('supervision', v as SupervisionKind)}>
            {SUPERVISION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>

        <Field label="Years since release">
          <TextInput type="number" value={draft.yearsSinceRelease == null ? '' : String(draft.yearsSinceRelease)} onChange={(v) => set('yearsSinceRelease', v === '' ? null : Math.max(0, Number(v)))} placeholder="e.g. 2" />
        </Field>
        <Field label="Education">
          <Select value={draft.education} onChange={(v) => set('education', v as EducationLevel)}>
            {EDUCATION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="ZIP"><TextInput value={draft.location} onChange={(v) => set('location', v)} placeholder="e.g. 43215" /></Field>
        <Field label="Career goal"><TextInput value={draft.careerGoal} onChange={(v) => set('careerGoal', v)} placeholder="e.g. CDL-A driver, welder" /></Field>
      </div>

      {/* Skills & certifications — searchable multi-select with custom "other" add */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ChipDisclosure
          icon={Wrench}
          label="Skills"
          selectedCodes={draft.skills}
          index={SKILL_INDEX}
        >
          <RichChipPicker
            categories={SKILL_CATEGORIES}
            index={SKILL_INDEX}
            selected={new Set(draft.skills)}
            onToggle={(code) => toggleIn('skills', code)}
            onClear={() => set('skills', [])}
            itemNoun="skill"
          />
        </ChipDisclosure>

        <ChipDisclosure
          icon={Award}
          label="Certifications held"
          selectedCodes={draft.certifications}
          index={CERT_INDEX}
        >
          <RichChipPicker
            categories={CERT_CATEGORIES}
            index={CERT_INDEX}
            selected={new Set(draft.certifications)}
            onToggle={(code) => toggleIn('certifications', code)}
            onClear={() => set('certifications', [])}
            itemNoun="certification"
          />
        </ChipDisclosure>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-slate-700">Barriers to address</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_BARRIERS.map((b) => {
            const on = draft.barriers.includes(b);
            return (
              <button
                key={b}
                onClick={() => toggleBarrier(b)}
                className={'rounded-full border px-3 py-1 text-xs font-semibold transition ' + (on ? 'border-sunset-500 bg-sunset-50 text-sunset-700' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')}
              >
                {BARRIER_LABELS[b]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Collapsible wrapper that makes a RichChipPicker behave like a dropdown:
 * a summary button (label + selected count + chips) that expands the picker.
 */
function ChipDisclosure({
  icon: Icon, label, selectedCodes, index, children,
}: {
  icon: typeof Wrench;
  label: string;
  selectedCodes: string[];
  index: Record<string, CatalogItem>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Icon className="h-4 w-4 text-teal-600" /> {label}
          <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (selectedCodes.length ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-500')}>
            {selectedCodes.length}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Compact preview of selections when collapsed */}
      {!open && selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2.5">
          {selectedCodes.slice(0, 6).map((code) => (
            <span key={code} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600 ring-1 ring-slate-200">
              {labelFor(code, index)}
            </span>
          ))}
          {selectedCodes.length > 6 && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200">
              +{selectedCodes.length - 6} more
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="max-h-[22rem] overflow-y-auto overscroll-contain border-t border-slate-200 p-3">
          {children}
        </div>
      )}
    </div>
  );
}
