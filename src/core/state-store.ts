import { useSyncExternalStore } from 'react';
import type { StateLogEntry } from './types';
import { ApiInspector } from './api-inspector';

type Listener = () => void;

let entries: StateLogEntry[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  if (listeners.size === 0) return;
  listeners.forEach(listener => listener());
}

export function getStateLogEntries(): readonly StateLogEntry[] {
  return entries;
}

export function hasStateLogListeners(): boolean {
  return listeners.size > 0;
}

/**
 * Records into the bounded ring buffer whenever the inspector is enabled —
 * mirrors network logging, which captures all traffic regardless of whether
 * the panel is open. The panel is a full-screen modal, so gating on panel
 * visibility would make it impossible to capture changes the user triggers
 * while interacting with the app. UI re-renders are still gated separately
 * via `emit()` (no-op when there are no subscribers).
 */
export function isStateLoggingActive(): boolean {
  return ApiInspector.isEnabled();
}

export function upsertStateLogEntry(entry: StateLogEntry): void {
  const max = ApiInspector.getStateMaxEntries();
  const existing = entries.find(item => item.id === entry.id);
  const merged: StateLogEntry = {
    ...entry,
    count: (existing?.count ?? 0) + 1
  };
  const without = entries.filter(item => item.id !== entry.id);
  entries = [merged, ...without].slice(0, max);
  emit();
}

export function clearStateLogEntries(): void {
  entries = [];
  emit();
}

export function subscribeStateLogStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStateLogEntries(): readonly StateLogEntry[] {
  return useSyncExternalStore(
    subscribeStateLogStore,
    getStateLogEntries,
    () => []
  );
}
