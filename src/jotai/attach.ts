import { ApiInspector } from "../core/api-inspector";
import { recordStateChange } from "../core/state-log";

/** Minimal Jotai store surface — compatible with `createStore()` from jotai. */
export type JotaiStoreLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: (atom: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: (atom: any, ...args: any[]) => any;
};

export type JotaiLoggerOptions = {
  storeName?: string;
  /** When true (default), only atoms with `debugLabel` are logged. */
  requireDebugLabel?: boolean;
  atomAllowlist?: string[];
};

function getAtomLabel(atom: unknown): string | undefined {
  if (!atom || typeof atom !== "object") return undefined;
  if ("debugLabel" in atom && (atom as { debugLabel?: string }).debugLabel) {
    return String((atom as { debugLabel?: string }).debugLabel);
  }
  return undefined;
}

function shouldLogAtom(atom: unknown, options: JotaiLoggerOptions): boolean {
  const label = getAtomLabel(atom);
  if (options.atomAllowlist?.length) {
    return label != null && options.atomAllowlist.includes(label);
  }
  const requireLabel = options.requireDebugLabel !== false;
  return requireLabel ? label != null : true;
}

const attachedStores = new WeakSet<object>();

export function attachJotaiLogger(
  store: JotaiStoreLike,
  options?: JotaiLoggerOptions,
): void {
  if (!ApiInspector.isEnabled()) return;
  if (attachedStores.has(store as object)) return;
  attachedStores.add(store as object);

  const resolvedOptions: JotaiLoggerOptions = {
    requireDebugLabel: true,
    ...options,
  };
  const storeLabel = resolvedOptions.storeName;

  const originalSet = store.set.bind(store);
  store.set = (atom: unknown, ...args: unknown[]) => {
    if (shouldLogAtom(atom, resolvedOptions)) {
      const label = getAtomLabel(atom) ?? "atom";
      const before = store.get(atom);
      const nextArg = args[0];
      let after: unknown;
      if (typeof nextArg === "function") {
        try {
          after = (nextArg as (prev: unknown) => unknown)(before);
        } catch {
          after = "[Updater threw]";
        }
      } else {
        after = nextArg;
      }
      recordStateChange({
        source: "jotai",
        label: storeLabel ? `${storeLabel}:${label}` : label,
        before,
        after,
      });
    }
    return originalSet(atom, ...args);
  };
}
