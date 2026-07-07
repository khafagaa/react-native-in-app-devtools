import type {
  ApiLogEntry,
  ApiLogError,
  ApiLogResponse
} from './types';
import {
  getApiLogEntryById,
  upsertApiLogEntry
} from './store';
import { redactHeaders, redactUnknown, truncateBody } from './redaction';

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type StartRequestInput = {
  method: string;
  url: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, unknown>;
  body?: unknown;
};

export function startApiLogRequest(input: StartRequestInput): string {
  const id = createId();
  const startedAt = Date.now();
  const entry: ApiLogEntry = {
    id,
    status: 'pending',
    method: input.method.toUpperCase(),
    url: input.url,
    startedAt,
    request: {
      method: input.method.toUpperCase(),
      url: input.url,
      queryParams: input.queryParams,
      headers: redactHeaders(input.headers),
      body: truncateBody(redactUnknown(input.body)),
      timestamp: startedAt
    }
  };
  upsertApiLogEntry(entry);
  return id;
}

export function completeApiLogRequest(
  id: string,
  response: ApiLogResponse
): void {
  const existing = getApiLogEntryById(id);
  if (!existing) return;

  const endedAt = Date.now();
  const updated: ApiLogEntry = {
    ...existing,
    status: 'success',
    statusCode: response.status,
    durationMs: endedAt - existing.startedAt,
    endedAt,
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: redactHeaders(response.headers),
      body: truncateBody(redactUnknown(response.body))
    }
  };
  upsertApiLogEntry(updated);
}

export function failApiLogRequest(id: string, error: ApiLogError): void {
  const existing = getApiLogEntryById(id);
  if (!existing) return;

  const endedAt = Date.now();
  const updated: ApiLogEntry = {
    ...existing,
    status: 'failed',
    statusCode: existing.statusCode,
    durationMs: endedAt - existing.startedAt,
    endedAt,
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack
    }
  };
  upsertApiLogEntry(updated);
}

export function updateApiLogRequestFailure(
  id: string,
  response: ApiLogResponse,
  error: ApiLogError
): void {
  const existing = getApiLogEntryById(id);
  if (!existing) return;

  const endedAt = Date.now();
  const updated: ApiLogEntry = {
    ...existing,
    status: 'failed',
    statusCode: response.status,
    durationMs: endedAt - existing.startedAt,
    endedAt,
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: redactHeaders(response.headers),
      body: truncateBody(redactUnknown(response.body))
    },
    error
  };
  upsertApiLogEntry(updated);
}
