'use client';

import {
  CONVICTION_LABELS, CONVICTION_TYPE_ORDER, USER_CONTEXT_OPTIONS,
  type ConvictionType, type UserContextMode, type EducationLevel,
} from '@dxp/shared';
import {
  BARRIER_LABELS, type Participant, type Barrier, type SupervisionKind,
} from '../../../lib/caseworker-store';
import { Field, TextInput, Select, splitTags } from '../fields';

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

        <Field label="Skills (comma-separated)" className="lg:col-span-2"><TextInput value={draft.skills.join(', ')} onChange={(v) => set('skills', splitTags(v))} placeholder="forklift, warehouse, customer service" /></Field>
        <Field label="Certifications held (comma-separated)" className="lg:col-span-2"><TextInput value={draft.certifications.join(', ')} onChange={(v) => set('certifications', splitTags(v))} placeholder="OSHA 10, ServSafe, forklift" /></Field>
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
