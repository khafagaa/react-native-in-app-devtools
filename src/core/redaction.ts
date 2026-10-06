import type { RedactionConfig } from './types';

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|x-api-key|token|accessToken|refreshToken|clientSecret|password|secret|eid|emiratesId/i;

const REDACTED = '***REDACTED***';

type ResolvedRedaction = {
  enabled: boolean;
  ignoreKeySet: Set<string>;
};

let resolved: ResolvedRedaction = {
  enabled: true,
  ignoreKeySet: new Set()
};

export function configureRedaction(config?: RedactionConfig): void {
  resolved = {
    enabled: config?.enabled ?? true,
    ignoreKeySet: new Set(
      (config?.ignoreKeys ?? []).map(key => key.toLowerCase())
    )
  };
}

export function getRedactionConfig(): Readonly<{
  enabled: boolean;
  ignoreKeys: string[];
}> {
  return {
    enabled: resolved.enabled,
    ignoreKeys: [...resolved.ignoreKeySet]
  };
}

function shouldRedactKey(key: string): boolean {
  if (resolved.ignoreKeySet.has(key.toLowerCase())) {
    return false;
  }
  return SENSITIVE_KEY_PATTERN.test(key);
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value == null) return value;
  if (typeof value === 'string' && value.length > 0) return REDACTED;
  if (typeof value === 'object') return redactWalk(value, seen);
  return REDACTED;
}

/** Redact sensitive keys in `application/x-www-form-urlencoded` / query strings. */
function redactFormOrQueryString(text: string): string {
  return text
    .split('&')
    .map(part => {
      const eq = part.indexOf('=');
      if (eq < 0) return part;
      let key = part.slice(0, eq);
      try {
        key = decodeURIComponent(key.replace(/\+/g, ' '));
      } catch {
        // keep raw key
      }
      if (!shouldRedactKey(key)) return part;
      return `${part.slice(0, eq)}=${REDACTED}`;
    })
    .join('&');
}

function looksLikeFormOrQueryString(value: string): boolean {
  if (!value.includes('=')) return false;
  return /(?:^|&)[^=&\s]+=/.test(value);
}

/**
 * Walks the full value (no depth cap) so nested bodies are shown in full.
 * `seen` only guards against circular references, which would otherwise
 * recurse forever; a repeated object is shown as `[Circular]`.
 */
function redactWalk(value: object, seen: WeakSet<object>): unknown {
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map(item => redactChild(item, seen));
    }
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = shouldRedactKey(key)
        ? redactValue(val, seen)
        : redactChild(val, seen);
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function redactChild(value: unknown, seen: WeakSet<object>): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    return looksLikeFormOrQueryString(value)
      ? redactFormOrQueryString(value)
      : value;
  }
  if (typeof value !== 'object') return value;
  return redactWalk(value, seen);
}

export function redactUnknown(value: unknown): unknown {
  if (!resolved.enabled) return value;
  return redactChild(value, new WeakSet<object>());
}

export function redactHeaders(
  headers?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!headers) return undefined;
  if (!resolved.enabled) return headers;
  return redactUnknown(headers) as Record<string, unknown>;
}
