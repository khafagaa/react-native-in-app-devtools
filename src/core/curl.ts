import type { ApiLogEntry } from './types';
import { redactHeaders } from './redaction';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function serializeBody(body: unknown): string | undefined {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

export function buildCurlFromLogEntry(entry: ApiLogEntry): string {
  const method = entry.method.toUpperCase();
  const parts = [`curl -X ${method} ${shellQuote(entry.url)}`];

  const headers = redactHeaders(entry.request.headers);
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      if (value == null) continue;
      parts.push(`-H ${shellQuote(`${key}: ${String(value)}`)}`);
    }
  }

  const body = serializeBody(entry.request.body);
  if (body && method !== 'GET' && method !== 'HEAD') {
    parts.push(`--data ${shellQuote(body)}`);
  }

  return parts.join(' \\\n  ');
}
