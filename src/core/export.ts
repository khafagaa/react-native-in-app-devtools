import type { ApiLogEntry } from './types';

/**
 * Serializes captured requests as pretty JSON. Entries are already redacted
 * when they enter the store, so the export carries no raw secrets. Pass only
 * the entries you want exported (e.g. the current list after removals).
 */
export function buildApiLogExport(entries: readonly ApiLogEntry[]): string {
  return JSON.stringify(entries, null, 2);
}
