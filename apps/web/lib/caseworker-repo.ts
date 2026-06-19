/**
 * CaseworkerRepo — the write seam between the cockpit UI and storage.
 *
 * Today every write goes to the browser-local store (caseworker-store.ts).
 * Reads stay on the synchronous useSyncExternalStore hooks for snappiness, but
 * all mutations flow through this async interface so a future
 * `serverCaseworkerRepo` (Postgres + auth) can be dropped in behind `getRepo()`
 * with zero UI changes — exactly the migration seam called for in
 * docs/caseworker-auth-plan.md step 6. The server impl would PATCH individual
 * tasks (hence the granular task methods) and disable writes in session-only
 * mode.
 */
import {
  saveParticipant, removeParticipant,
  addTask as storeAddTask, updateTask as storeUpdateTask,
  setTaskStatus as storeSetTaskStatus, removeTask as storeRemoveTask,
  reconcileGeneratedTasks as storeReconcile,
  getCaseload, getParticipant,
  type Participant, type Task, type NewTask, type TaskStatus,
} from './caseworker-store';

export interface CaseworkerRepo {
  list(): Promise<Participant[]>;
  get(id: string): Promise<Participant | null>;
  save(p: Participant): Promise<Participant>;
  remove(id: string): Promise<void>;
  addTask(pid: string, t: NewTask): Promise<Task>;
  updateTask(pid: string, taskId: string, patch: Partial<Task>): Promise<void>;
  setTaskStatus(pid: string, taskId: string, status: TaskStatus): Promise<void>;
  removeTask(pid: string, taskId: string): Promise<void>;
  reconcileGeneratedTasks(pid: string, generated: NewTask[]): Promise<void>;
}

export const localCaseworkerRepo: CaseworkerRepo = {
  list: async () => getCaseload(),
  get: async (id) => getParticipant(id),
  save: async (p) => saveParticipant(p),
  remove: async (id) => removeParticipant(id),
  addTask: async (pid, t) => storeAddTask(pid, t),
  updateTask: async (pid, taskId, patch) => storeUpdateTask(pid, taskId, patch),
  setTaskStatus: async (pid, taskId, status) => storeSetTaskStatus(pid, taskId, status),
  removeTask: async (pid, taskId) => storeRemoveTask(pid, taskId),
  reconcileGeneratedTasks: async (pid, generated) => storeReconcile(pid, generated),
};

let active: CaseworkerRepo = localCaseworkerRepo;

/** Swap the active repository (e.g. install serverCaseworkerRepo after auth). */
export function setRepo(repo: CaseworkerRepo) { active = repo; }
export function getRepo(): CaseworkerRepo { return active; }
