import type { StateLogEntry, StateLogSource } from './types';
import { isStateLoggingActive, upsertStateLogEntry, clearStateLogEntries } from './state-store';
import { redactUnknown, truncateBody } from './redaction';
import { ApiInspector } from './api-inspector';

/**
 * Stable id per source+label so repeated writes to the same atom/store/action
 * update the existing row in place (newest on top) instead of stacking
 * duplicate rows.
 */
function stateEntryId(source: StateLogSource, label: string): string {
  return `${source}:${label}`;
}

export type RecordStateChangeInput = {
  source: StateLogSource;
  label: string;
  before?: unknown;
  after?: unknown;
  changedKeys?: string[];
};

export function shouldIgnoreStateLabel(
  label: string,
  source: StateLogSource
): boolean {
  const config = ApiInspector.getStateLoggerConfig();
  if (source === 'redux' && config.ignoreAction?.(label)) {
    return true;
  }
  if (source === 'jotai' && config.ignoreAtom?.(label)) {
    return true;
  }
  return false;
}

export function recordStateChange(input: RecordStateChangeInput): void {
  if (!isStateLoggingActive()) return;
  if (shouldIgnoreStateLabel(input.label, input.source)) return;

  const entry: StateLogEntry = {
    id: stateEntryId(input.source, input.label),
    source: input.source,
    label: input.label,
    timestamp: Date.now(),
    before:
      input.before !== undefined
        ? truncateBody(redactUnknown(input.before))
        : undefined,
    after:
      input.after !== undefined
        ? truncateBody(redactUnknown(input.after))
        : undefined,
    changedKeys: input.changedKeys
  };
  upsertStateLogEntry(entry);
}

export function clearStateLogger(): void {
  clearStateLogEntries();
}
