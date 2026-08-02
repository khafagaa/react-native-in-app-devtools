import type { AxiosInstance } from 'axios';
import { attachApiInspectorInterceptor } from '../axios/attach';
import {
  withBaseQuery as instrumentBaseQuery,
  type WithBaseQueryOptions
} from '../rtk/base-query';
import { configureRedaction } from './redaction';
import {
  DEFAULT_MAX_ENTRIES,
  DEFAULT_MAX_STATE_ENTRIES,
  type RedactionConfig,
  type StateLoggerConfig
} from './types';

export type ApiInspectorConfig = {
  /** When false, interceptors and UI are no-ops. */
  enabled?: boolean;
  maxEntries?: number;
  /** Called after copy actions (cURL, tab payload, etc.). */
  onCopied?: (label: string) => void;
  /** FAB background color override. */
  fabColor?: string;
  /** Redaction options for network + state payloads. */
  redaction?: RedactionConfig;
  /** State logger options (Redux / Zustand / Jotai adapters). */
  stateLogger?: StateLoggerConfig;
};

type ResolvedConfig = Required<
  Pick<ApiInspectorConfig, 'enabled' | 'maxEntries'>
> &
  Pick<ApiInspectorConfig, 'onCopied' | 'fabColor' | 'stateLogger'> & {
    redaction: RedactionConfig;
  };

const DEFAULT_REDACTION: RedactionConfig = {
  enabled: true,
  ignoreKeys: []
};

let resolved: ResolvedConfig = {
  enabled: false,
  maxEntries: DEFAULT_MAX_ENTRIES,
  redaction: { ...DEFAULT_REDACTION },
  stateLogger: {
    maxEntries: DEFAULT_MAX_STATE_ENTRIES
  }
};

function resolveConfig(input: ApiInspectorConfig): ResolvedConfig {
  return {
    enabled: input.enabled ?? false,
    maxEntries: input.maxEntries ?? DEFAULT_MAX_ENTRIES,
    onCopied: input.onCopied,
    fabColor: input.fabColor,
    redaction: {
      ...DEFAULT_REDACTION,
      ...resolved.redaction,
      ...input.redaction,
      ignoreKeys:
        input.redaction?.ignoreKeys ??
        resolved.redaction.ignoreKeys ??
        DEFAULT_REDACTION.ignoreKeys
    },
    stateLogger: {
      ...resolved.stateLogger,
      ...input.stateLogger
    }
  };
}

export const ApiInspector = {
  init(config: ApiInspectorConfig): void {
    resolved = resolveConfig({ ...resolved, ...config });
    configureRedaction(resolved.redaction);
  },

  isEnabled(): boolean {
    return resolved.enabled;
  },

  getMaxEntries(): number {
    return resolved.maxEntries;
  },

  getStateMaxEntries(): number {
    return resolved.stateLogger?.maxEntries ?? DEFAULT_MAX_STATE_ENTRIES;
  },

  getStateLoggerConfig(): Readonly<StateLoggerConfig> {
    return resolved.stateLogger ?? { maxEntries: DEFAULT_MAX_STATE_ENTRIES };
  },

  getRedactionConfig(): Readonly<RedactionConfig> {
    return resolved.redaction;
  },

  getConfig(): Readonly<ResolvedConfig> {
    return resolved;
  },

  notifyCopied(label: string): void {
    resolved.onCopied?.(label);
  },

  withAxios(instance: AxiosInstance, baseURL?: string): AxiosInstance {
    if (!resolved.enabled) {
      return instance;
    }
    const resolvedBase = baseURL ?? String(instance.defaults.baseURL ?? '');
    attachApiInspectorInterceptor(instance, resolvedBase);
    return instance;
  },

  /**
   * Typed as a real method (not a property assignment) so TS keeps the
   * generic from `instrumentBaseQuery` instead of erasing it.
   */
  withBaseQuery<TBaseQuery extends Parameters<typeof instrumentBaseQuery>[0]>(
    baseQuery: TBaseQuery,
    options?: WithBaseQueryOptions
  ): TBaseQuery {
    return instrumentBaseQuery(baseQuery, options);
  }
};

/** @deprecated Use `ApiInspector.isEnabled()` */
export function isApiInspectorEnabled(): boolean {
  return ApiInspector.isEnabled();
}
