import { buildCurlFromLogEntry } from '../../core/curl';
import type { ApiLogEntry } from '../../core/types';

export function stringifyForCopy(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isEmptyCopyValue(value: unknown): boolean {
  return stringifyForCopy(value).length === 0;
}

/**
 * Combined copy: cURL, request body and response in one block.
 * Empty sections are left out so the output only contains real data.
 */
export function buildCopyAllFromLogEntry(entry: ApiLogEntry): string {
  const sections: string[] = [`# cURL\n${buildCurlFromLogEntry(entry)}`];

  const requestBody = stringifyForCopy(entry.request.body);
  if (requestBody.length > 0) {
    sections.push(`# Request Body\n${requestBody}`);
  }

  const response = stringifyForCopy(entry.response?.body);
  if (response.length > 0) {
    sections.push(`# Response\n${response}`);
  }

  return sections.join('\n\n');
}
