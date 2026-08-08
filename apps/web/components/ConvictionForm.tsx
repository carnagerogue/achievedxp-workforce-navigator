'use client';

import type { ConvictionCategory, ConvictionDto, OffenseType } from '@dxp/shared';

const CATEGORIES: { value: ConvictionCategory; label: string }[] = [
  { value: 'FELONY',      label: 'Felony' },
  { value: 'MISDEMEANOR', label: 'Misdemeanor' },
  { value: 'INFRACTION',  label: 'Infraction' },
];

// User-facing labels. Dignity-centered, neutral phrasing — these strings
// are what a candidate sees during onboarding. The DB enum still uses
// uppercase values; the new lowercase ConvictionType (in @dxp/shared)
// is used by the compatibility engine.
const OFFENSE_TYPES: { value: OffenseType; label: string }[] = [
  { value: 'DRUG_POSSESSION',    label: 'Drug possession-related conviction' },
  { value: 'DRUG_DISTRIBUTION',  label: 'Drug distribution-related conviction' },
  { value: 'VIOLENT',            label: 'Violence-related conviction' },
  { value: 'REGISTRY_RELATED',   label: 'Registry-related conviction' },
  { value: 'PROPERTY_THEFT',     label: 'Property or theft-related conviction' },
  { value: 'PROPERTY_BURGLARY',  label: 'Burglary-related conviction' },
  { value: 'FINANCIAL_FRAUD',    label: 'Financial fraud-related conviction' },
  { value: 'WEAPONS',            label: 'Weapons-related conviction' },
  { value: 'DUI',                label: 'DUI/DWI-related conviction' },
  { value: 'OTHER',              label: 'Other conviction' },
];

type Props = {
  conviction: ConvictionDto;
  index: number;
  onChange: (c: ConvictionDto) => void;
  onRemove: () => void;
};

export function ConvictionForm({ conviction, index, onChange, onRemove }: Props) {
  const update = <K extends keyof ConvictionDto>(key: K, value: ConvictionDto[K]) =>
    onChange({ ...conviction, [key]: value });

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">Conviction #{index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-rose-700 hover:underline"
        >
          Remove
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category">
          <select
            value={conviction.category}
            onChange={(e) => update('category', e.target.value as ConvictionCategory)}
            className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="Offense type">
          <select
            value={conviction.offenseType}
            onChange={(e) => update('offenseType', e.target.value as OffenseType)}
            className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          >
            {OFFENSE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Exact offense name or statute (optional)">
          <input
            type="text"
            value={conviction.exactOffense ?? ''}
            onChange={(e) => update('exactOffense', e.target.value || undefined)}
            placeholder="As shown on court paperwork"
            autoComplete="off"
            className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </Field>

        <Field label="State/territory of conviction (optional)">
          <input
            type="text"
            value={conviction.jurisdictionRegion ?? ''}
            onChange={(e) => update('jurisdictionRegion', e.target.value.toUpperCase().slice(0, 2) || undefined)}
            placeholder="e.g. CA"
            maxLength={2}
            autoComplete="address-level1"
            className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm uppercase"
          />
        </Field>

        <Field label="Year of conviction (optional)">
          <YearInput
            value={conviction.convictionYear}
            onChange={(y) => update('convictionYear', y)}
          />
        </Field>

        <Field label="Year of release (if applicable)">
          <YearInput
            value={conviction.releaseYear}
            onChange={(y) => update('releaseYear', y)}
            disabled={conviction.currentlyIncarcerated}
          />
        </Field>

        <Field label="Year sentence ended (optional)">
          <YearInput
            value={conviction.sentenceCompletionYear}
            onChange={(y) => update('sentenceCompletionYear', y)}
          />
        </Field>
      </div>

      <p className="mt-3 rounded-md border border-teal-100 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
        Exact details improve regulated-job checks. Broad categories alone cannot determine school, healthcare,
        banking, transportation, licensing, or waiver eligibility. Only add information you are comfortable using
        for optional background-aware guidance.
      </p>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <Check label="Currently incarcerated"
               checked={!!conviction.currentlyIncarcerated}
               onChange={(v) => update('currentlyIncarcerated', v)} />
        <Check label="On parole"
               checked={!!conviction.onParole}
               onChange={(v) => update('onParole', v)} />
        <Check label="On probation"
               checked={!!conviction.onProbation}
               onChange={(v) => update('onProbation', v)} />
        <Check label="Required to register under state law"
               checked={!!(conviction.registryStatus ?? conviction.sexOffenderRegistry)}
               onChange={(v) => update('registryStatus', v)} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function YearInput({ value, onChange, disabled }: { value?: number; onChange: (y: number | undefined) => void; disabled?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <input
      type="number"
      min={1900}
      max={year}
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Number(v));
      }}
      placeholder="e.g. 2019"
      className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      {label}
    </label>
  );
}

/** Factory for the default shape when adding a new conviction row. */
export function newConviction(): ConvictionDto {
  return {
    category: 'FELONY',
    offenseType: 'OTHER',
  };
}
