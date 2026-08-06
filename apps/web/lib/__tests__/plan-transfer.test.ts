/**
 * Round-trip fidelity for the portable plan (v2) — participant profile fields
 * (location / skills / contextMode / yearsSinceRelease / notes) and
 * deterministic task ids + refs must survive export → encode → decode →
 * import, and v1 payloads (no profile extras, no item ids) must still import
 * with the historical defaults.
 */
import { describe, expect, it } from '@jest/globals';
import {
  encodePlan, decodePlan, parsePlanText,
  participantToPortable, portableToParticipant,
  checklistToPortable, portableToChecklist,
  type PortablePlan,
} from '../plan-transfer';
import type { Participant, Task } from '../caseworker-store';
import type { ChecklistItem } from '../checklist-store';

const NOW = Date.now();

const task = (overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task => ({
  status: 'planned',
  category: 'other',
  source: 'plan',
  createdAt: NOW,
  ...overrides,
});

const participant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'p_test1',
  name: 'Jordan Díaz',
  conviction: 'drug_distribution',
  contextMode: 'on_supervision',
  supervision: 'parole_and_probation',
  officerName: 'Officer Reyes',
  nextReportDate: '2026-09-01',
  yearsSinceRelease: 2,
  education: 'high_school_or_ged',
  skills: ['forklift', 'general_labor'],
  certifications: ['OSHA 10'],
  location: '43215',
  careerGoal: 'Warehouse lead',
  barriers: ['transportation', 'housing'],
  notes: 'Prefers morning appointments.',
  tasks: [
    task({ id: 'match:job-1', title: 'Apply: Warehouse Associate — Acme', category: 'application', source: 'match', domain: 'jobs', ref: { jobId: 'job-1' } }),
    task({ id: 'train:step-2', title: 'Training: Forklift certification', category: 'training', source: 'training', domain: 'credentials_skills', ref: { url: 'https://training.example/forklift', stepId: 'step-2' } }),
    task({ id: 'barrier:res-3', title: 'Connect: COTA transit passes', category: 'barrier', source: 'barrier', notes: 'transit', domain: 'transportation', ref: { url: 'https://cota.example' } }),
    task({ id: 'dol-ajc:c-4', title: 'Visit Job Center: Columbus AJC', category: 'appointment', source: 'dol', domain: 'work_readiness', ref: { url: 'https://ajc.example' } }),
    task({ id: 'readiness:housing', title: 'Secure stable housing', category: 'barrier', domain: 'housing' }),
    task({ id: 't_manual01', title: 'Get state ID', status: 'completed', completedAt: NOW, dueDate: '2026-07-01' }),
  ],
  readiness: { housing: 'in_progress' },
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

describe('portable plan v2 round trip (participant → code → participant)', () => {
  const src = participant();
  const exported = participantToPortable(src);
  const decoded = decodePlan(encodePlan(exported));
  const imported = portableToParticipant(decoded);

  it('exports v2 and survives the base64 code unchanged', () => {
    expect(exported.v).toBe(2);
    expect(decoded).toEqual(JSON.parse(JSON.stringify(exported)));
  });

  it('preserves profile fields instead of hardcoding them', () => {
    expect(imported.contextMode).toBe('on_supervision');
    expect(imported.location).toBe('43215');
    expect(imported.skills).toEqual(['forklift', 'general_labor']);
    expect(imported.certifications).toEqual(['OSHA 10']);
    expect(imported.education).toBe('high_school_or_ged');
    expect(imported.yearsSinceRelease).toBe(2);
    expect(imported.notes).toBe('Prefers morning appointments.');
    expect(imported.supervision).toBe('parole_and_probation');
    expect(imported.barriers).toEqual(['transportation', 'housing']);
    expect(imported.name).toBe('Jordan Díaz'); // unicode survives the code
  });

  it('preserves deterministic task ids so reconcileGeneratedTasks stays idempotent', () => {
    const ids = (imported.tasks ?? []).map((t) => t.id);
    expect(ids).toEqual([
      'match:job-1', 'train:step-2', 'barrier:res-3', 'dol-ajc:c-4', 'readiness:housing', 't_manual01',
    ]);
    // The exact mechanism reconcileGeneratedTasks uses — a re-generated task's
    // deterministic id is already present, so it will not be re-added.
    const existing = new Set(ids);
    expect(existing.has('match:job-1')).toBe(true);
    expect(existing.has('readiness:housing')).toBe(true);
  });

  it('preserves task refs (jobId / url / stepId), statuses and due dates', () => {
    const byId = new Map((imported.tasks ?? []).map((t) => [t.id, t]));
    expect(byId.get('match:job-1')?.ref).toEqual({ jobId: 'job-1' });
    expect(byId.get('train:step-2')?.ref).toEqual({ url: 'https://training.example/forklift', stepId: 'step-2' });
    expect(byId.get('barrier:res-3')?.ref).toEqual({ url: 'https://cota.example' });
    expect(byId.get('t_manual01')?.status).toBe('completed');
    expect(byId.get('t_manual01')?.dueDate).toBe('2026-07-01');
    expect(byId.get('readiness:housing')?.domain).toBe('housing');
  });
});

describe('v1 payloads still import (backward compatibility)', () => {
  // A v1 file as the old code wrote it: no item ids/refs, no profile extras.
  const v1: PortablePlan = {
    v: 1,
    kind: 'reentry-plan',
    exportedAt: '2026-01-01T00:00:00.000Z',
    person: { name: 'Sam Lee', goals: 'CDL driver' },
    items: [
      { name: 'Franklin County Job Center', type: 'Job center', status: 'contacted', targetDate: '2026-08-20', url: 'https://jobcenter.example' },
      { name: 'Housing intake', type: 'Support service', category: 'Housing', status: 'planned' },
    ],
    profile: { conviction: 'property_theft', supervision: 'probation', education: 'some_college', certifications: [], barriers: ['housing'] },
  };

  it('decodes an encoded v1 payload and a raw v1 JSON file', () => {
    expect(decodePlan(encodePlan(v1))).toEqual(v1);
    expect(parsePlanText(JSON.stringify(v1))).toEqual(v1);
  });

  it('imports as participant with the historical defaults for missing v2 fields', () => {
    const p = portableToParticipant(decodePlan(encodePlan(v1)));
    expect(p.contextMode).toBe('recently_released');
    expect(p.location).toBe('');
    expect(p.skills).toEqual([]);
    expect(p.yearsSinceRelease).toBeNull();
    expect(p.notes).toBe('Imported from a participant-built plan.');
    expect(p.supervision).toBe('probation');
    expect(p.education).toBe('some_college');
    // No carried ids → fresh minted ids, ref rebuilt from the flat url.
    const tasks = p.tasks ?? [];
    expect(tasks).toHaveLength(2);
    for (const t of tasks) expect(t.id).toMatch(/^t_/);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(2);
    expect(tasks[0].ref).toEqual({ url: 'https://jobcenter.example' });
    expect(tasks[0].status).toBe('contacted');
  });

  it('imports as checklist with minted import: ids when none are carried', () => {
    const items = portableToChecklist(v1);
    expect(items[0].id).toMatch(/^import:0:/);
    expect(items[0].url).toBe('https://jobcenter.example');
  });
});

describe('checklist ↔ portable keeps deterministic ids across sides', () => {
  const checklist: ChecklistItem[] = [
    {
      id: 'readiness:housing', name: 'Secure stable housing', type: 'Readiness step',
      category: 'Housing', status: 'scheduled', targetDate: '2026-08-15',
      url: 'https://housing.example', addedAt: NOW, domain: 'housing',
    },
    {
      id: 'ajc:oh-123', name: 'OhioMeansJobs Center', type: 'Job center',
      status: 'completed', addedAt: NOW, completedAt: NOW,
    },
  ];
  const exported = checklistToPortable(checklist, 'Sam Lee', 'CDL driver');
  const decoded = decodePlan(encodePlan(exported));

  it('exports v2 with the original item ids', () => {
    expect(exported.v).toBe(2);
    expect(decoded.items.map((i) => i.id)).toEqual(['readiness:housing', 'ajc:oh-123']);
  });

  it('re-imports to a checklist with the same ids (merge stays duplicate-free)', () => {
    const back = portableToChecklist(decoded);
    expect(back.map((i) => i.id)).toEqual(['readiness:housing', 'ajc:oh-123']);
    expect(back[0].status).toBe('scheduled');
    expect(back[0].targetDate).toBe('2026-08-15');
  });

  it('imports into the caseworker side with the same deterministic ids', () => {
    const p = portableToParticipant(decoded);
    expect((p.tasks ?? []).map((t) => t.id)).toEqual(['readiness:housing', 'ajc:oh-123']);
  });
});
