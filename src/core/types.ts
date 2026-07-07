export type ApiLogStatus = 'pending' | 'success' | 'failed';

export type ApiLogRequest = {
  method: string;
  url: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, unknown>;
  body?: unknown;
  timestamp: number;
};

export type ApiLogResponse = {
  status: number;
  statusText?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
};

export type ApiLogError = {
  message: string;
  code?: string;
  stack?: string;
};

export type ApiLogEntry = {
  id: string;
  status: ApiLogStatus;
  method: string;
  url: string;
  statusCode?: number;
  durationMs?: number;
  startedAt: number;
  endedAt?: number;
  request: ApiLogRequest;
  response?: ApiLogResponse;
  error?: ApiLogError;
};

export const DEFAULT_MAX_ENTRIES = 50;

export type StateLogSource = 'redux' | 'zustand' | 'jotai';

export type StateLogEntry = {
  id: string;
  source: StateLogSource;
  label: string;
  timestamp: number;
  before?: unknown;
  after?: unknown;
  changedKeys?: string[];
  /** How many times this label has been written (deduped in place). */
  count?: number;
};

export const DEFAULT_MAX_STATE_ENTRIES = 50;

export type StateLoggerConfig = {
  maxEntries?: number;
  ignoreAction?: (label: string) => boolean;
  ignoreAtom?: (label: string) => boolean;
};

