const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|x-api-key|token|accessToken|refreshToken|clientSecret|password|secret|eid|emiratesId/i;

const REDACTED = '***REDACTED***';

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function redactValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string' && value.length > 0) return REDACTED;
  if (typeof value === 'object') return redactUnknown(value);
  return REDACTED;
}

export function redactUnknown(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[Truncated]';
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map(item => redactUnknown(item, depth + 1));
  }
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = shouldRedactKey(key)
      ? redactValue(val)
      : redactUnknown(val, depth + 1);
  }
  return out;
}

export function redactHeaders(
  headers?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!headers) return undefined;
  return redactUnknown(headers) as Record<string, unknown>;
}

export function truncateBody(value: unknown, maxChars = 12000): unknown {
  if (value == null) return value;

  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'function') {
    text = '[Function]';
  } else {
    try {
      text = JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      text = String(value);
    }
  }

  if (text.length <= maxChars) {
    return value;
  }
  return `${text.slice(0, maxChars)}\n… [truncated]`;
}
