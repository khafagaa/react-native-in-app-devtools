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
