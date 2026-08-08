'use client';

import { useSyncExternalStore } from 'react';
import type { ReentryInputs } from './reentry-journey';
import { lsGet, lsSet, onStoreChange } from './scoped-storage';

/**
 * Navigator guide state — the user's optional self-reported context, the
 * steps they've completed, and a short future goal. Browser-local, same
 * subscribe/notify pattern as the other stores.
 */

const INPUTS_KEY = 'dxp.reentry.inputs';
const DONE_KEY = 'dxp.reentry.done';
const GOAL_KEY = 'dxp.reentry.goal';

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((fn) => fn());

function read<T>(key: string, fallback: T): T {
  const raw = lsGet(key);
  try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) { lsSet(key, JSON.stringify(value)); }

let inputs: ReentryInputs = read<ReentryInputs>(INPUTS_KEY, {});
let done: string[] = read<string[]>(DONE_KEY, []);
let futureSelf: string = read<string>(GOAL_KEY, '');

// Re-read from the active scope whenever the signed-in user changes or another
// tab writes. This is what makes the store per-user.
onStoreChange(() => {
  inputs = read<ReentryInputs>(INPUTS_KEY, {});
  done = read<string[]>(DONE_KEY, []);
  futureSelf = read<string>(GOAL_KEY, '');
  emit();
});
function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

export function getReentryInputs(): ReentryInputs { return inputs; }
export function setReentryInputs(patch: Partial<ReentryInputs>) {
  inputs = { ...inputs, ...patch };
  write(INPUTS_KEY, inputs); emit();
}

export function getCompletedSteps(): string[] { return done; }
export function isStepDone(id: string): boolean { return done.includes(id); }
export function setStepDone(id: string, value: boolean) {
  const has = done.includes(id);
  if (value && !has) done = [...done, id];
  else if (!value && has) done = done.filter((x) => x !== id);
  else return;
  write(DONE_KEY, done); emit();
}

export function getFutureSelf(): string { return futureSelf; }
export function setFutureSelf(v: string) { futureSelf = v; write(GOAL_KEY, v); emit(); }

const EMPTY_INPUTS: ReentryInputs = {};
const EMPTY_DONE: string[] = [];
export function useReentryInputs(): ReentryInputs {
  return useSyncExternalStore(subscribe, getReentryInputs, () => EMPTY_INPUTS);
}
export function useCompletedSteps(): string[] {
  return useSyncExternalStore(subscribe, getCompletedSteps, () => EMPTY_DONE);
}
export function useFutureSelf(): string {
  return useSyncExternalStore(subscribe, getFutureSelf, () => '');
}
