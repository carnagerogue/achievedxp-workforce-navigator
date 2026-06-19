'use client';

import { useState } from 'react';
import {
  ListChecks, Plus, Trash2, ExternalLink, Briefcase, GraduationCap,
  FileText, LifeBuoy, CalendarClock, Circle, AlertTriangle, Check,
} from 'lucide-react';
import {
  TASK_STATUS_ORDER, TASK_STATUS_LABELS, TASK_CATEGORY_LABELS,
  type Participant, type Task, type TaskStatus, type TaskCategory,
} from '../../../lib/caseworker-store';
import { getRepo } from '../../../lib/caseworker-repo';
import { progressPct, overdueTasks } from '../../../lib/caseworker-progress';

const CATEGORY_ICON: Record<TaskCategory, typeof Briefcase> = {
  application: Briefcase,
  training: GraduationCap,
  document: FileText,
  barrier: LifeBuoy,
  appointment: CalendarClock,
  other: Circle,
};

const STATUS_PILL: Record<TaskStatus, string> = {
  planned: 'border-slate-300 bg-slate-50 text-slate-600',
  contacted: 'border-sky-300 bg-sky-50 text-sky-700',
  scheduled: 'border-violet-300 bg-violet-50 text-violet-700',
  completed: 'border-teal-400 bg-teal-50 text-teal-700',
};

export function ActionPlanPanel({ participant }: { participant: Participant }) {
  const repo = getRepo();
  const tasks = participant.tasks ?? [];
  const pct = progressPct(participant);
  const overdueIds = new Set(overdueTasks(participant).map((t) => t.id));
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');

  const ordered = [...tasks].sort(
    (a, b) => TASK_STATUS_ORDER.indexOf(a.status) - TASK_STATUS_ORDER.indexOf(b.status) || a.createdAt - b.createdAt,
  );

  const addManual = () => {
    const t = title.trim();
    if (!t) return;
    repo.addTask(participant.id, { title: t, category, source: 'manual' });
    setTitle(''); setCategory('other'); setAdding(false);
  };

  return (
    <section id="plan" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
          <ListChecks className="h-4 w-4 text-teal-600" /> Action plan
          <span className="text-sm font-normal text-slate-400">({tasks.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          {overdueIds.size > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" /> {overdueIds.size} overdue
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pct}%</span>
          </div>
        </div>
      </div>

      {tasks.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          No tasks yet. Add items from the matches, barriers, training, or labor-market panels — or create one below.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {ordered.map((t) => (
          <TaskRow key={t.id} pid={participant.id} task={t} overdue={overdueIds.has(t.id)} />
        ))}
      </ul>

      {adding ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addManual(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Task title…"
            className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <select
            value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
          >
            {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => (
              <option key={c} value={c}>{TASK_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <button onClick={addManual} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Add</button>
          <button onClick={() => setAdding(false)} className="rounded-md px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add task
        </button>
      )}
    </section>
  );
}

function TaskRow({ pid, task, overdue }: { pid: string; task: Task; overdue: boolean }) {
  const repo = getRepo();
  const Icon = CATEGORY_ICON[task.category];
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <li className={'rounded-xl border p-3 ' + (overdue ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200')}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => repo.setTaskStatus(pid, task.id, task.status === 'completed' ? 'planned' : 'completed')}
          className={
            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ' +
            (task.status === 'completed'
              ? 'border-teal-500 bg-teal-500 text-white'
              : 'border-slate-300 bg-white text-transparent hover:border-teal-400 hover:text-teal-300')
          }
          aria-label={task.status === 'completed' ? 'Mark not done' : 'Mark done'}
        >
          <Check className="h-3 w-3" />
        </button>
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={'text-sm font-semibold text-navy-900 ' + (task.status === 'completed' ? 'line-through opacity-60' : '')}>
              {task.title}
            </p>
            <button
              onClick={() => repo.removeTask(pid, task.id)}
              className="shrink-0 text-slate-300 transition hover:text-rose-500"
              aria-label="Remove task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <select
              value={task.status}
              onChange={(e) => repo.setTaskStatus(pid, task.id, e.target.value as TaskStatus)}
              className={'cursor-pointer rounded-full border px-2 py-1 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 ' + STATUS_PILL[task.status]}
            >
              {TASK_STATUS_ORDER.map((s) => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
            </select>
            <input
              type="date" value={task.dueDate ?? ''}
              onChange={(e) => repo.updateTask(pid, task.id, { dueDate: e.target.value || undefined })}
              className={'rounded-md border px-1.5 py-1 text-[11px] focus:border-teal-500 focus:outline-none ' + (overdue ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-600')}
            />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {task.source}
            </span>
            {task.ref?.url && (
              <a href={task.ref.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline">
                <ExternalLink className="h-3 w-3" /> Open
              </a>
            )}
            {task.ref?.jobId && (
              <a href={`/jobs/${task.ref.jobId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline">
                <Briefcase className="h-3 w-3" /> Job
              </a>
            )}
            <button onClick={() => setNotesOpen((v) => !v)} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">
              {task.notes ? 'Notes ✎' : '+ note'}
            </button>
          </div>

          {notesOpen && (
            <textarea
              defaultValue={task.notes ?? ''} rows={2}
              onBlur={(e) => repo.updateTask(pid, task.id, { notes: e.target.value })}
              placeholder="Notes for this task…"
              className="mt-2 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          )}
        </div>
      </div>
    </li>
  );
}
