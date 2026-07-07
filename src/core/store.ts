import { useSyncExternalStore } from 'react';
import { ApiInspector } from './api-inspector';
import type { ApiLogEntry } from './types';

type Listener = () => void;

let entries: ApiLogEntry[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  if (listeners.size === 0) return;
  listeners.forEach(listener => listener());
}

export function hasApiLogListeners(): boolean {
  return listeners.size > 0;
}

export function getApiLogEntries(): readonly ApiLogEntry[] {
  return entries;
}

export function getApiLogEntryById(id: string): ApiLogEntry | undefined {
  return entries.find(entry => entry.id === id);
}

export function setApiLogEntries(next: ApiLogEntry[]): void {
  const max = ApiInspector.getMaxEntries();
  entries = next.slice(0, max);
  emit();
}

export function upsertApiLogEntry(entry: ApiLogEntry): void {
  const without = entries.filter(existing => existing.id !== entry.id);
  setApiLogEntries([entry, ...without]);
}

export function clearApiLogEntries(): void {
  entries = [];
  emit();
}

export function subscribeApiLogStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApiLogEntries(): readonly ApiLogEntry[] {
  return useSyncExternalStore(subscribeApiLogStore, getApiLogEntries, () => []);
}
