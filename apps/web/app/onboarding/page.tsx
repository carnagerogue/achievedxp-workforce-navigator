'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserCircle2, MapPin, Wrench, Award, Factory, ArrowRight, ArrowLeft, Check, CheckCircle2,
  ShieldCheck, Sparkles, LockKeyhole, Target, Radar, ChevronRight,
} from 'lucide-react';
import type { ConvictionDto } from '@dxp/shared';
import { createUser, upsertProfile } from '../../lib/api';
import { getUserId, setUserId } from '../../lib/session';
import { getLocalProfile, setLocalProfile } from '../../lib/local-profile';
import { ConvictionForm, newConviction } from '../../components/ConvictionForm';
import { RichChipPicker } from '../../components/RichChipPicker';
import {
  SKILL_CATEGORIES, SKILL_INDEX,
  CERT_CATEGORIES, CERT_INDEX,
  INDUSTRY_CATEGORIES, INDUSTRY_INDEX,
} from '../../lib/catalogs';
import { useToast } from '../../components/Toast';
import { AUTH_ENABLED } from '../../lib/auth-config';
import { useUser } from '@clerk/nextjs';

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
  { id: 'background', title: 'Support options',      subtitle: 'Personalize only what applies',            Icon: ShieldCheck },
];

type GoalPanel = 'skills' | 'certifications' | 'industries';

const STEP_STORIES = [
  {
    kicker: 'Start with you',
    title: 'A profile that works for you.',
    copy: 'A few essentials create your private starting point. You stay in control of what comes next.',
  },
  {
    kicker: 'Bring work closer',
    title: 'Opportunity should meet you where you are.',
    copy: 'Your area and logistics help us prioritize realistic routes—not just jobs that look good on paper.',
  },
  {
    kicker: 'Build your signal',
    title: 'Turn what you know into momentum.',
    copy: 'Choose only what feels true. Each signal sharpens the roles, training, and next steps we bring forward.',
  },
  {
    kicker: 'Only what applies',
    title: 'Choose any extra support you want.',
    copy: 'This step is optional. Record-aware guidance stays private and appears only when you request it.',
  },
] as const;

const GOAL_TABS: ReadonlyArray<{ id: GoalPanel; label: string; hint: string; Icon: LucideIcon }> = [
  { id: 'skills', label: 'Skills', hint: 'What you can do', Icon: Wrench },
  { id: 'certifications', label: 'Credentials', hint: 'What you have earned', Icon: Award },
  { id: 'industries', label: 'Industries', hint: 'Where you want to go', Icon: Factory },
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
  const [goalPanel, setGoalPanel] = useState<GoalPanel>('skills');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    email: '',
    displayName: '',
    locationCity: '',
    locationRegion: '',
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

  // Hydrate from the saved profile when editing, so "Edit profile" doesn't
  // overwrite the record with blanks. Runs after mount to avoid an SSR/client
  // hydration mismatch.
  useEffect(() => {
    const p = getLocalProfile();
    if (!p) return;
    setState({
      email: p.email ?? '',
      displayName: p.displayName ?? '',
      locationCity: p.locationCity ?? '',
      locationRegion: p.locationRegion ?? '',
      locationPostalCode: p.locationPostalCode ?? '',
      yearsExperience: p.yearsExperience ?? 0,
      hasTransportation: p.hasTransportation ?? false,
      willingToRelocate: p.willingToRelocate ?? false,
      skills: new Set(p.skills ?? []),
      certifications: new Set(p.certifications ?? []),
      desiredIndustries: new Set(p.desiredIndustries ?? []),
      hasRecord: p.justiceSupportEnabled ?? (p.convictions?.length ?? 0) > 0,
      onParoleOrProbation: p.onParoleOrProbation ?? false,
      convictions: (p.convictions ?? []) as ConvictionDto[],
    });
  }, []);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const selectedSignals = state.skills.size + state.certifications.size + state.desiredIndustries.size;

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

      const hasFelonyRecord = state.hasRecord && state.convictions.some((c) => c.category === 'FELONY');
      const profilePayload = {
        userId,
        locationCity: state.locationCity || undefined,
        locationRegion: state.locationRegion || undefined,
        locationPostalCode: state.locationPostalCode || undefined,
        yearsExperience: state.yearsExperience,
        hasTransportation: state.hasTransportation,
        willingToRelocate: state.willingToRelocate,
        hasFelonyRecord,
        justiceSupportEnabled: state.hasRecord,
        onParoleOrProbation: state.hasRecord && state.onParoleOrProbation,
        convictions: state.hasRecord ? state.convictions : [],
        skills: [...state.skills],
        certifications: [...state.certifications],
        desiredIndustries: [...state.desiredIndustries],
      };
      await upsertProfile(profilePayload);
      // Mirror locally so Browse /jobs + job detail score with the real profile
      // and "Edit profile" can re-hydrate this wizard.
      setLocalProfile({ ...profilePayload, email: state.email, displayName: state.displayName });

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
    <div className="onboarding-experience full-bleed animate-fade-in">
      {AUTH_ENABLED && <AccountPrefill onValue={(email, displayName) => setState((current) => ({ ...current, email: current.email || email, displayName: current.displayName || displayName }))} />}

      <div className="onboarding-layout">
        <aside className="onboarding-guidance" aria-label="Your profile route">
          <div className="onboarding-guidance__glow" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-200/75">
                <Sparkles className="h-3.5 w-3.5" /> Achieve intelligence
              </p>
              <span className="font-mono text-[10px] tabular-nums tracking-[0.18em] text-white/35">0{stepIdx + 1} / 04</span>
            </div>

            <div key={step.id} className="onboarding-story mt-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sunset-300">{STEP_STORIES[stepIdx].kicker}</p>
              <h2 className="mt-4 max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-white xl:text-[3.25rem]">
                {STEP_STORIES[stepIdx].title}
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-teal-50/65">{STEP_STORIES[stepIdx].copy}</p>
            </div>

            <OnboardingTrajectory current={stepIdx} selectedSignals={selectedSignals} />

            <div className="relative mt-auto flex items-start gap-3 border-t border-white/10 pt-5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-200/20 bg-teal-100/10 text-teal-200">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Private by design</p>
                <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-white/45">Your background context stays out of employer applications. You choose what to share.</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="onboarding-workspace">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-8 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white">{stepIdx + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-navy-900">Profile setup</p>
                <p className="text-[10px] text-slate-400">About {Math.max(1, 4 - stepIdx)} min left</p>
              </div>
            </div>
            <Link href="/" className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-navy-900">Exit setup</Link>
          </header>

          <div className="px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pb-12">
            <ol className="onboarding-steps" aria-label="Profile setup progress">
              {STEPS.map((s, i) => {
                const status = i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'upcoming';
                return (
                  <li key={s.id} className={`onboarding-steps__item is-${status}`}>
                    <button
                      type="button"
                      onClick={() => { if (i < stepIdx) setStepIdx(i); }}
                      disabled={i > stepIdx}
                      aria-current={i === stepIdx ? 'step' : undefined}
                      aria-label={`${s.title}${status === 'done' ? ', completed' : status === 'current' ? ', current step' : ', upcoming'}`}
                    >
                      <span>{status === 'done' ? <Check className="h-3 w-3" /> : i + 1}</span>
                      <em>{s.title}</em>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div key={step.id} className="onboarding-panel mx-auto mt-10 max-w-3xl">
              <div className="lg:hidden">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sunset-600">{STEP_STORIES[stepIdx].kicker}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{STEP_STORIES[stepIdx].copy}</p>
              </div>

              <div className="mt-6 flex items-start gap-4 lg:mt-0">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700">
                  <step.Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700">Step {stepIdx + 1} · {step.subtitle}</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-navy-900 sm:text-4xl">{step.title}</h1>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isLast) handleSubmit();
                  else next();
                }}
                className="mt-8"
              >
                {step.id === 'account' && (
                  <FieldGroup title="Your starting point" subtitle="We use this to save your profile and make the experience feel like yours.">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField label="Email address" type="email" value={state.email} onChange={(v) => update('email', v)} required placeholder="you@example.com" />
                      <TextField label="What should we call you?" value={state.displayName} onChange={(v) => update('displayName', v)} placeholder="First name or nickname" />
                    </div>
                  </FieldGroup>
                )}

                {step.id === 'location' && (
                  <FieldGroup title="Your opportunity radius" subtitle="Location improves nearby job, training, and support recommendations. Every field is optional.">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField label="City" value={state.locationCity} onChange={(v) => update('locationCity', v)} placeholder="e.g. Seattle" />
                      <RegionSelect value={state.locationRegion} onChange={(v) => update('locationRegion', v)} />
                      <TextField label="ZIP code" value={state.locationPostalCode} onChange={(v) => update('locationPostalCode', v.replace(/\D/g, '').slice(0, 5))} placeholder="5 digits" />
                      <NumberField label="Years of work experience" value={state.yearsExperience} onChange={(v) => update('yearsExperience', v)} min={0} max={60} />
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <CheckboxField label="I have reliable transportation" checked={state.hasTransportation} onChange={(v) => update('hasTransportation', v)} />
                      <CheckboxField label="I'm open to relocating" checked={state.willingToRelocate} onChange={(v) => update('willingToRelocate', v)} />
                    </div>
                  </FieldGroup>
                )}

                {step.id === 'goals' && (
                  <FieldGroup title="Shape your recommendations" subtitle="This is optional. Start with the signal that best represents you—you can add or change anything later.">
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Recommendation signals">
                      {GOAL_TABS.map(({ id, label, hint, Icon }) => {
                        const count = id === 'skills' ? state.skills.size : id === 'certifications' ? state.certifications.size : state.desiredIndustries.size;
                        const active = goalPanel === id;
                        return (
                          <button key={id} type="button" onClick={() => setGoalPanel(id)} aria-pressed={active}
                            className={`onboarding-signal-tab ${active ? 'is-active' : ''}`}>
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors"><Icon className="h-4 w-4" /></span>
                            <span className="min-w-0 flex-1 text-left"><strong>{label}</strong><small>{hint}</small></span>
                            {count > 0 ? <em>{count}</em> : <ChevronRight className="h-4 w-4 text-slate-300" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                      {goalPanel === 'skills' && (
                        <RichChipPicker categories={SKILL_CATEGORIES} index={SKILL_INDEX} selected={state.skills}
                          onToggle={(v) => toggle('skills', v)} onClear={() => setState((p) => ({ ...p, skills: new Set() }))}
                          itemNoun="skill" recommendedMax={8} variant="onboarding" />
                      )}
                      {goalPanel === 'certifications' && (
                        <RichChipPicker categories={CERT_CATEGORIES} index={CERT_INDEX} selected={state.certifications}
                          onToggle={(v) => toggle('certifications', v)} onClear={() => setState((p) => ({ ...p, certifications: new Set() }))}
                          itemNoun="certification" variant="onboarding" />
                      )}
                      {goalPanel === 'industries' && (
                        <RichChipPicker categories={INDUSTRY_CATEGORIES} index={INDUSTRY_INDEX} selected={state.desiredIndustries}
                          onToggle={(v) => toggle('desiredIndustries', v)} onClear={() => setState((p) => ({ ...p, desiredIndustries: new Set() }))}
                          itemNoun="industry" allowCustom={false} recommendedMax={4} variant="onboarding" />
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-teal-50 px-4 py-3 text-xs text-teal-900">
                      <span className="inline-flex items-center gap-2"><Radar className="h-4 w-4 text-teal-600" /> {selectedSignals ? `${selectedSignals} matching signal${selectedSignals === 1 ? '' : 's'} active` : 'Your matches will start broad'}</span>
                      <span className="hidden text-teal-700 sm:inline">Optional</span>
                    </div>
                  </FieldGroup>
                )}

                {step.id === 'background' && (
                  <FieldGroup title="Support, only if you want it" subtitle="This optional section is for people who want record-aware guidance. Skip it and Achieve stays a general workforce navigator.">
                    <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                        <div><p className="text-sm font-semibold text-teal-900">Never included in employer applications</p><p className="mt-1 text-xs leading-relaxed text-teal-800/75">Background context stays separate from the materials you use to apply.</p></div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <CheckboxField label="I want optional guidance for background-related barriers" checked={state.hasRecord} onChange={(v) => update('hasRecord', v)} />
                    </div>

                    {state.hasRecord && (
                      <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
                        <CheckboxField label="I'm currently on parole or probation" checked={state.onParoleOrProbation} onChange={(v) => update('onParoleOrProbation', v)} />
                        {state.convictions.length === 0 && <p className="text-xs leading-relaxed text-slate-500">Add what you know. Every field inside an entry is optional.</p>}
                        <div className="space-y-3">
                          {state.convictions.map((c, i) => (
                            <ConvictionForm key={i} conviction={c} index={i} onChange={(value) => updateConviction(i, value)} onRemove={() => removeConviction(i)} />
                          ))}
                        </div>
                        <button type="button" onClick={addConviction} className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800">+ Add background context</button>
                      </div>
                    )}
                  </FieldGroup>
                )}

                {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</div>}

                <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <button type="button" onClick={back} disabled={stepIdx === 0}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-navy-900 disabled:pointer-events-none disabled:opacity-0">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  {!isLast ? (
                    <button type="submit" disabled={!canAdvance()}
                      className="group inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(29,38,64,.18)] transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
                      Continue to {STEPS[stepIdx + 1].title} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <button type="submit" disabled={submitting}
                      className="group inline-flex min-w-[210px] items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(12,112,105,.22)] transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
                      {submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Building your route…</> : <><CheckCircle2 className="h-4 w-4" /> Show my next step</>}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ───────── Form primitives ─────────

function OnboardingTrajectory({ current, selectedSignals }: { current: number; selectedSignals: number }) {
  return (
    <div className="onboarding-trajectory mt-12">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white"><Radar className="h-4 w-4 text-teal-300" /> Your matching route</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">Live</span>
      </div>
      <div className="onboarding-trajectory__path mt-5">
        <span className="onboarding-trajectory__track" aria-hidden="true"><i style={{ height: `${(current / (STEPS.length - 1)) * 100}%` }} /></span>
        <ol>
          {STEPS.map((step, index) => {
            const reached = index <= current;
            return (
              <li key={step.id} className={index === current ? 'is-current' : reached ? 'is-reached' : ''}>
                <span className="onboarding-trajectory__node" aria-hidden="true">{index < current ? <Check className="h-3 w-3" /> : index === current ? <span /> : index + 1}</span>
                <div><strong>{step.title}</strong><small>{index === current ? 'In progress' : index < current ? 'Signal added' : 'Coming next'}</small></div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="onboarding-destination mt-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sunset-400 text-white"><Target className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><small>Your destination</small><strong>{selectedSignals > 0 ? 'Focused matches, explained' : 'A clearer next step'}</strong></div>
        {selectedSignals > 0 && <em>{selectedSignals} signals</em>}
      </div>
    </div>
  );
}

function FieldGroup({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <fieldset className="onboarding-fieldset">
      <legend className="sr-only">{title}</legend>
      <div className="mb-6 border-b border-slate-200 pb-5">
        <h2 className="text-base font-semibold tracking-tight text-navy-900">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
      <div>{children}</div>
    </fieldset>
  );
}

function TextField({
  label, value, onChange, type = 'text', required, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-navy-900 shadow-[0_1px_2px_rgba(15,23,42,.03)] transition placeholder:text-slate-300 hover:border-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
        className="block h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:border-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
        className="block h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:border-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        <option value="" disabled>Select your state or territory</option>
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

function AccountPrefill({ onValue }: { onValue: (email: string, displayName: string) => void }) {
  const { isLoaded, user } = useUser();
  const delivered = useRef(false);
  useEffect(() => {
    if (!isLoaded || !user || delivered.current) return;
    delivered.current = true;
    onValue(
      user.primaryEmailAddress?.emailAddress ?? '',
      user.fullName ?? user.username ?? '',
    );
  }, [isLoaded, user, onValue]);
  return null;
}

function CheckboxField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm transition ${checked ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent group-hover:border-teal-400'}`}><Check className="h-3 w-3" /></span>
      <span className="font-medium">{label}</span>
    </label>
  );
}
