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

export function createReduxStateLoggerMiddleware(
  options?: ReduxStateLoggerOptions
) {
  return () => (next: (action: unknown) => unknown) => (action: unknown) => {
    const typedAction = action as {
      type?: string;
      payload?: unknown;
    };
    const label = typedAction.type ?? 'unknown';

    const shouldIgnore =
      options?.ignoreAction?.(label) ?? defaultIgnoreReduxAction(label);

    if (!shouldIgnore && label !== 'unknown') {
      recordStateChange({
        source: 'redux',
        label,
        after: typedAction.payload
      });
    }

    return next(action);
  };
}
