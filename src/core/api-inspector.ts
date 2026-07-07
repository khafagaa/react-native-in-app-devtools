import type { AxiosInstance } from 'axios';
import { attachApiInspectorInterceptor } from '../axios/attach';
import { withBaseQuery } from '../rtk/base-query';
import {
  DEFAULT_MAX_ENTRIES,
  DEFAULT_MAX_STATE_ENTRIES,
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
  /** State logger options (Redux / Zustand / Jotai adapters). */
  stateLogger?: StateLoggerConfig;
};

type ResolvedConfig = Required<
  Pick<ApiInspectorConfig, 'enabled' | 'maxEntries'>
> &
  Pick<ApiInspectorConfig, 'onCopied' | 'fabColor' | 'stateLogger'>;

let resolved: ResolvedConfig = {
  enabled: false,
  maxEntries: DEFAULT_MAX_ENTRIES,
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
    stateLogger: {
      ...resolved.stateLogger,
      ...input.stateLogger
    }
  };
}

export const ApiInspector = {
  init(config: ApiInspectorConfig): void {
    resolved = resolveConfig({ ...resolved, ...config });
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

  withBaseQuery: withBaseQuery
};

/** @deprecated Use `ApiInspector.isEnabled()` */
export function isApiInspectorEnabled(): boolean {
  return ApiInspector.isEnabled();
}
