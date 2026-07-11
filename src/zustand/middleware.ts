import { ApiInspector } from '../core/api-inspector';
import { recordStateChange } from '../core/state-log';

export type ZustandLoggerOptions = {
  name: string;
};

type SetState<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
  replace?: boolean
) => void;

type GetState<T> = () => T;

type StateCreator<T> = (
  set: SetState<T>,
  get: GetState<T>,
  api: unknown
) => T;

function shallowChangedKeys<T extends object>(
  prev: T,
  next: T
): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (
      (prev as Record<string, unknown>)[key] !==
      (next as Record<string, unknown>)[key]
    ) {
      changed.push(key);
    }
  }
  return changed;
}

function pickKeys<T extends object>(
  state: T,
  keys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = (state as Record<string, unknown>)[key];
  }
  return out;
}

export function withZustandLogger<T extends object>(
  initializer: StateCreator<T>,
  options: ZustandLoggerOptions
): StateCreator<T> {
  if (!ApiInspector.isEnabled()) {
    return initializer;
  }

  return (set, get, api) => {
    const loggedSet: SetState<T> = (partial, replace) => {
      const prev = get();
      set(partial, replace);
      const next = get();
      const changedKeys = shallowChangedKeys(prev, next);
      for (const key of changedKeys) {
        recordStateChange({
          source: 'zustand',
          label: `${options.name}/${key}`,
          before: pickKeys(prev, [key]),
          after: pickKeys(next, [key]),
          changedKeys: [key]
        });
      }
    };

    return initializer(loggedSet, get, api);
  };
}
