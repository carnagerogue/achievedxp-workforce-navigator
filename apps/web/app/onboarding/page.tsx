'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCircle2, MapPin, Scale, Wrench, Award, Factory, ArrowRight, ArrowLeft, Check, CheckCircle2,
} from 'lucide-react';
import type { ConvictionDto } from '@dxp/shared';
import { createUser, upsertProfile } from '../../lib/api';
import { getUserId, setUserId } from '../../lib/session';
import { ConvictionForm, newConviction } from '../../components/ConvictionForm';
import { RichChipPicker } from '../../components/RichChipPicker';
import {
  SKILL_CATEGORIES, SKILL_INDEX,
  CERT_CATEGORIES, CERT_INDEX,
  INDUSTRY_CATEGORIES, INDUSTRY_INDEX,
} from '../../lib/catalogs';
import { useToast } from '../../components/Toast';

// Reference data — mirrors apps/api/prisma/seed.ts so skill/cert/industry
// labels stay consistent end-to-end. Phase 6 will swap to live lookups.
const SKILL_OPTIONS = [
  'forklift_operation', 'commercial_driving', 'welding', 'carpentry', 'hvac',
  'customer_service', 'food_service', 'warehouse_operations', 'computer_literacy',
];
const CERT_OPTIONS = ['osha_10', 'osha_30', 'cdl_a', 'cdl_b', 'servsafe', 'forklift'];
const INDUSTRY_OPTIONS = [
  'construction', 'warehousing', 'transportation', 'food_service',
  'manufacturing', 'cleaning', 'services', 'healthcare',
];
// All 50 states + DC + U.S. territories. Sorted by full name (rendered as
// "AL — Alabama") rather than code so users can scan it. Matches the USPS
// 2-letter codes used everywhere else in the system.
const US_REGIONS: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },        { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },        { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },     { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },    { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },        { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },         { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },       { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },           { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },       { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },          { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },      { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },       { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },       { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },     { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },           { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },         { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },   { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },   { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },          { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },        { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },     { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },      { code: 'WY', name: 'Wyoming' },
  // U.S. territories
  { code: 'AS', name: 'American Samoa' },
  { code: 'GU', name: 'Guam' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'VI', name: 'U.S. Virgin Islands' },
];

type LucideIcon = typeof UserCircle2;

interface Step {
  id: 'account' | 'location' | 'goals' | 'background';
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}
const STEPS: Step[] = [
  { id: 'account',    title: 'Account',              subtitle: 'Email + display name',                  Icon: UserCircle2 },
  { id: 'location',   title: 'Location',             subtitle: 'Where you\'re looking + logistics',     Icon: MapPin },
  { id: 'goals',      title: 'Skills & Industries',  subtitle: 'What you bring, what you want',         Icon: Wrench },
  { id: 'background', title: 'Background',           subtitle: 'Structured conviction history (optional)', Icon: Scale },
];

interface WizardState {
  email: string;
  displayName: string;
  locationCity: string;
  locationRegion: string;
  locationPostalCode: string;
  yearsExperience: number;
  hasTransportation: boolean;
  willingToRelocate: boolean;
  skills: Set<string>;
  certifications: Set<string>;
  desiredIndustries: Set<string>;
  hasRecord: boolean;
  onParoleOrProbation: boolean;
  convictions: ConvictionDto[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    email: '',
    displayName: '',
    locationCity: '',
    locationRegion: 'OH',
    locationPostalCode: '',
    yearsExperience: 0,
    hasTransportation: false,
    willingToRelocate: false,
    skills: new Set<string>(),
    certifications: new Set<string>(),
    desiredIndustries: new Set<string>(),
    hasRecord: false,
    onParoleOrProbation: false,
    convictions: [],
  });

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  // Scroll to top on step change so the user lands at the heading rather
  // than mid-form. Honors prefers-reduced-motion.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [stepIdx]);

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: 'skills' | 'certifications' | 'desiredIndustries', value: string) =>
    setState((prev) => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });

  const addConviction = () =>
    setState((s) => ({ ...s, convictions: [...s.convictions, newConviction()] }));
  const updateConviction = (index: number, c: ConvictionDto) =>
    setState((s) => {
      const next = [...s.convictions];
      next[index] = c;
      return { ...s, convictions: next };
    });
  const removeConviction = (index: number) =>
    setState((s) => ({ ...s, convictions: s.convictions.filter((_, i) => i !== index) }));

  // Per-step validation: keep the Next button active only when required
  // fields are filled. Everything after step 1 is optional but we still
  // block Next until *something* was provided on the Account step.
  const canAdvance = (): boolean => {
    if (step.id === 'account') {
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email);
    }
    return true;
  };

  const next = () => {
    if (!canAdvance()) return;
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
    setError(null);
  };
  const back = () => {
    setStepIdx((i) => Math.max(0, i - 1));
    setError(null);
  };

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let userId = getUserId();
      if (!userId) {
        const user = await createUser({
          email: state.email,
          displayName: state.displayName || undefined,
        });
        userId = user.id;
        setUserId(userId);
      }

      const hasFelonyRecord = state.convictions.some((c) => c.category === 'FELONY');
      await upsertProfile({
        userId,
        locationCity: state.locationCity || undefined,
        locationRegion: state.locationRegion || undefined,
        locationPostalCode: state.locationPostalCode || undefined,
        yearsExperience: state.yearsExperience,
        hasTransportation: state.hasTransportation,
        willingToRelocate: state.willingToRelocate,
        hasFelonyRecord,
        onParoleOrProbation: state.onParoleOrProbation,
        convictions: state.hasRecord ? state.convictions : [],
        skills: [...state.skills],
        certifications: [...state.certifications],
        desiredIndustries: [...state.desiredIndustries],
      });

      toast.success('Profile saved', 'Loading your matches…');
      router.push('/dashboard');
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error('Could not save profile', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* ─── Progress header ─── */}
      <div className="rounded-3xl border border-slate-200 bg-white bg-hero-radial p-7 shadow-card sm:p-8">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          <UserCircle2 className="h-3.5 w-3.5" /> Profile setup · step {stepIdx + 1} of {STEPS.length}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          {step.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{step.subtitle}</p>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-[width] duration-500"
              style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Step pills */}
          <ol className="mt-4 grid grid-cols-4 gap-2 text-xs">
            {STEPS.map((s, i) => {
              const state =
                i < stepIdx ? 'done' :
                i === stepIdx ? 'current' :
                'upcoming';
              return (
                <li
                  key={s.id}
                  className={
                    'flex items-center gap-1.5 truncate rounded-lg px-2 py-1.5 ' +
                    (state === 'current' ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200' :
                     state === 'done'    ? 'text-teal-700' :
                     'text-slate-400')
                  }
                >
                  <span className={
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ' +
                    (state === 'current' ? 'bg-teal-600 text-white' :
                     state === 'done'    ? 'bg-teal-100 text-teal-700' :
                     'bg-slate-100 text-slate-500')
                  }>
                    {state === 'done' ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="truncate font-medium">{s.title}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ─── Step body ─── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isLast) handleSubmit();
          else next();
        }}
        className="mt-5 space-y-5"
      >
        {step.id === 'account' && (
          <FieldGroup title="Account" Icon={UserCircle2}>
            <TextField label="Email"                         type="email" value={state.email}       onChange={(v) => update('email', v)} required />
            <TextField label="Display name (optional)"        value={state.displayName} onChange={(v) => update('displayName', v)} />
          </FieldGroup>
        )}

        {step.id === 'location' && (
          <FieldGroup title="Location & logistics" Icon={MapPin}>
            <TextField label="City" value={state.locationCity} onChange={(v) => update('locationCity', v)} />
            <RegionSelect
              value={state.locationRegion}
              onChange={(v) => update('locationRegion', v)}
            />
            <TextField
              label="ZIP code"
              value={state.locationPostalCode}
              onChange={(v) => update('locationPostalCode', v.replace(/\D/g, '').slice(0, 5))}
            />
            <NumberField label="Years of work experience" value={state.yearsExperience} onChange={(v) => update('yearsExperience', v)} min={0} max={60} />
            <CheckboxField label="I have reliable transportation"  checked={state.hasTransportation} onChange={(v) => update('hasTransportation', v)} />
            <CheckboxField label="I'm open to relocating"          checked={state.willingToRelocate}  onChange={(v) => update('willingToRelocate', v)} />
          </FieldGroup>
        )}

        {step.id === 'goals' && (
          <>
            <FieldGroup title="Skills you bring" Icon={Wrench}>
              <RichChipPicker
                categories={SKILL_CATEGORIES}
                index={SKILL_INDEX}
                selected={state.skills}
                onToggle={(v) => toggle('skills', v)}
                onClear={() => setState((p) => ({ ...p, skills: new Set() }))}
                itemNoun="skill"
                recommendedMax={8}
              />
            </FieldGroup>
            <FieldGroup title="Certifications you've earned" Icon={Award}>
              <RichChipPicker
                categories={CERT_CATEGORIES}
                index={CERT_INDEX}
                selected={state.certifications}
                onToggle={(v) => toggle('certifications', v)}
                onClear={() => setState((p) => ({ ...p, certifications: new Set() }))}
                itemNoun="certification"
              />
            </FieldGroup>
            <FieldGroup title="Industries you want to work in" Icon={Factory}>
              <RichChipPicker
                categories={INDUSTRY_CATEGORIES}
                index={INDUSTRY_INDEX}
                selected={state.desiredIndustries}
                onToggle={(v) => toggle('desiredIndustries', v)}
                onClear={() => setState((p) => ({ ...p, desiredIndustries: new Set() }))}
                itemNoun="industry"
                allowCustom={false}
                recommendedMax={4}
              />
            </FieldGroup>
          </>
        )}

        {step.id === 'background' && (
          <FieldGroup
            title="Background context"
            Icon={Scale}
            subtitle="Used only to filter out roles unlikely to hire and surface ones that will — never shared with employers. Skip this section if it doesn't apply."
          >
            <CheckboxField
              label="I have a criminal record"
              checked={state.hasRecord}
              onChange={(v) => update('hasRecord', v)}
            />

            {state.hasRecord && (
              <div className="space-y-3">
                <CheckboxField
                  label="Currently on parole or probation"
                  checked={state.onParoleOrProbation}
                  onChange={(v) => update('onParoleOrProbation', v)}
                />

                {state.convictions.length === 0 && (
                  <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">
                    Add at least one conviction so we can apply the right filters. Every field
                    within each entry is optional — fill what you know.
                  </p>
                )}

                <div className="space-y-3">
                  {state.convictions.map((c, i) => (
                    <ConvictionForm
                      key={i}
                      conviction={c}
                      index={i}
                      onChange={(next) => updateConviction(i, next)}
                      onRemove={() => removeConviction(i)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addConviction}
                  className="w-full rounded-lg border border-dashed border-slate-400 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
                >
                  + Add a conviction
                </button>
              </div>
            )}
          </FieldGroup>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        {/* ─── Nav ─── */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={back}
            disabled={stepIdx === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {!isLast ? (
            <button
              type="submit"
              disabled={!canAdvance()}
              className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Finish & see matches</>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ───────── Form primitives ─────────

function FieldGroup({
  title, subtitle, Icon, children,
}: { title: string; subtitle?: string; Icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-navy-900">
        {Icon && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Icon className="h-4 w-4" />
          </span>
        )}
        {title}
      </legend>
      {subtitle && <p className="mb-3 px-1 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-2 space-y-3">{children}</div>
    </fieldset>
  );
}

function TextField({
  label, value, onChange, type = 'text', required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
    </label>
  );
}

function NumberField({
  label, value, onChange, min, max,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="block w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
    </label>
  );
}

function RegionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">Region</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        {US_REGIONS.map((r) => (
          <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
        ))}
      </select>
      <span className="mt-1 block text-[11px] text-slate-500">
        50 states + DC + U.S. territories.
      </span>
    </label>
  );
}

function CheckboxField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
      {label}
    </label>
  );
}

function ChipGroup({
  options, selected, onToggle,
}: { options: string[]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={
              'rounded-full border px-3 py-1 text-xs font-medium transition ' +
              (active
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')
            }
          >
            {opt.replace(/_/g, ' ')}
          </button>
        );
      })}
    </div>
  );
}
