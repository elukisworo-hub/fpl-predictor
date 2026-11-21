import { useSyncExternalStore } from 'react';
import { createInitialState, migrate, type ProgressState } from './model';

/**
 * Local, offline progress storage. The whole learning record is a small JSON
 * document in localStorage, written after every change so nothing is lost if
 * the app is closed mid-game. No data leaves the device.
 */

const KEY = 'eak.progress.v1';
type Listener = () => void;

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : createInitialState();
  } catch {
    return createInitialState();
  }
}

let state: ProgressState = typeof localStorage !== 'undefined' ? load() : createInitialState();
const listeners = new Set<Listener>();
let saveError = false;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = false;
  } catch {
    saveError = true;
  }
}

export const getState = () => state;
export const hasSaveError = () => saveError;

export function setState(update: (s: ProgressState) => ProgressState) {
  const next = update(state);
  if (next === state) return;
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function replaceState(next: ProgressState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Ask the browser not to evict our storage (best effort). */
export function requestPersistentStorage() {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEY = KEY;
