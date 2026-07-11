import { recordStateChange } from '../core/state-log';

const DEFAULT_IGNORE_PATTERNS: RegExp[] = [
  /^@@/,
  /^persist\//,
  /^api\/executeQuery\/(pending|fulfilled|rejected)/,
  /^api\/subscriptions\//
];

export type ReduxStateLoggerOptions = {
  ignoreAction?: (label: string) => boolean;
};

export function defaultIgnoreReduxAction(label: string): boolean {
  return DEFAULT_IGNORE_PATTERNS.some(pattern => pattern.test(label));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns only the changed portion of the state tree so the inspector shows
 * the specific attribute(s) that an action mutated instead of the whole root
 * state. Recurses into nested plain objects (e.g. slices) so a change to
 * `profile.theme` surfaces as `{ profile: { theme } }` rather than the entire
 * profile slice.
 */
function diffChangedState(
  before: unknown,
  after: unknown
): { before: unknown; after: unknown } {
  if (!isPlainObject(before) || !isPlainObject(after)) {
    return { before, after };
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const beforeChanged: Record<string, unknown> = {};
  const afterChanged: Record<string, unknown> = {};
  for (const key of keys) {
    const prevValue = before[key];
    const nextValue = after[key];
    if (prevValue === nextValue) continue;
    if (isPlainObject(prevValue) && isPlainObject(nextValue)) {
      const nested = diffChangedState(prevValue, nextValue);
      beforeChanged[key] = nested.before;
      afterChanged[key] = nested.after;
    } else {
      beforeChanged[key] = prevValue;
      afterChanged[key] = nextValue;
    }
  }
  return { before: beforeChanged, after: afterChanged };
}

export function createReduxStateLoggerMiddleware(
  options?: ReduxStateLoggerOptions
) {
  return (store: { getState: () => unknown }) =>
    (next: (action: unknown) => unknown) =>
    (action: unknown) => {
      const typedAction = action as {
        type?: string;
        payload?: unknown;
      };
      const label = typedAction.type ?? 'unknown';

      const shouldIgnore =
        options?.ignoreAction?.(label) ?? defaultIgnoreReduxAction(label);

      const before = store?.getState?.();
      const result = next(action);
      const after = store?.getState?.();

      const changed = diffChangedState(before, after);

      if (!shouldIgnore && label !== 'unknown') {
        recordStateChange({
          source: 'redux',
          label,
          before: changed.before,
          after: changed.after,
          changedKeys: isPlainObject(changed.after)
            ? Object.keys(changed.after)
            : undefined
        });
      }

      return result;
    };
}
