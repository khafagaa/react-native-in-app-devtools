import { ApiInspector } from '../core/api-inspector';
import {
  completeApiLogRequest,
  failApiLogRequest,
  startApiLogRequest,
  updateApiLogRequestFailure
} from '../core/http-log';

type FetchArgs = {
  url: string;
  method?: string;
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, unknown>;
};

type QueryReturnValue<T = unknown> = {
  data?: T;
  error?: {
    status?: number | string;
    data?: unknown;
    error?: string;
  };
  meta?: unknown;
};

type BaseQueryFn<
  Args = unknown,
  Result = unknown,
  Error = unknown,
  DefinitionExtraOptions = Record<string, unknown>,
  Meta = Record<string, unknown>
> = (
  args: Args,
  api: unknown,
  extraOptions: DefinitionExtraOptions
) => Promise<QueryReturnValue<Result>>;

export type WithBaseQueryOptions = {
  baseUrl?: string;
};

function headersToRecord(
  headers: unknown
): Record<string, unknown> | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  return { ...(headers as Record<string, unknown>) };
}

function queryParamsFromRecord(
  params?: Record<string, unknown>
): Record<string, string> | undefined {
  if (!params) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    out[key] = Array.isArray(value)
      ? value.map(String).join(',')
      : String(value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildUrl(
  args: string | FetchArgs,
  baseUrl?: string
): { method: string; url: string; queryParams?: Record<string, string> } {
  if (typeof args === 'string') {
    const base = String(baseUrl ?? '').replace(/\/$/, '');
    const path = args.startsWith('/') ? args : `/${args}`;
    const url = /^https?:\/\//i.test(args)
      ? args
      : base
        ? `${base}${path}`
        : args;
    return { method: 'GET', url };
  }

  const method = String(args.method ?? 'GET').toUpperCase();
  const base = String(baseUrl ?? '').replace(/\/$/, '');
  const path = String(args.url ?? '');
  let url = /^https?:\/\//i.test(path)
    ? path
    : base
      ? `${base}${path.startsWith('/') ? path : `/${path}`}`
      : path;

  const queryParams = queryParamsFromRecord(args.params);
  if (queryParams) {
    const search = new URLSearchParams(queryParams);
    const query = search.toString();
    if (query) {
      url += url.includes('?') ? `&${query}` : `?${query}`;
    }
  }

  return { method, url, queryParams };
}

function statusFromRtkError(
  status?: number | string
): number | undefined {
  if (typeof status === 'number') return status;
  if (typeof status === 'string') {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function withBaseQuery<
  Args = unknown,
  Result = unknown,
  TError = unknown,
  DefinitionExtraOptions = Record<string, unknown>,
  Meta = Record<string, unknown>
>(
  baseQuery: BaseQueryFn<
    Args,
    Result,
    TError,
    DefinitionExtraOptions,
    Meta
  >,
  options?: WithBaseQueryOptions
): BaseQueryFn<Args, Result, TError, DefinitionExtraOptions, Meta> {
  if (!ApiInspector.isEnabled()) {
    return baseQuery;
  }

  return async (args, api, extraOptions) => {
    const { method, url, queryParams } = buildUrl(
      args as string | FetchArgs,
      options?.baseUrl
    );
    const fetchArgs = typeof args === 'string' ? undefined : (args as FetchArgs);

    const id = startApiLogRequest({
      method,
      url,
      queryParams,
      headers: headersToRecord(fetchArgs?.headers),
      body: fetchArgs?.body
    });

    try {
      const result = await baseQuery(args, api, extraOptions);

      if (result.error) {
        const status = statusFromRtkError(result.error.status);
        if (status != null) {
          updateApiLogRequestFailure(
            id,
            {
              status,
              statusText: String(result.error.status ?? 'Error'),
              body: result.error.data
            },
            {
              message:
                result.error.error ??
                `RTK Query error (${String(result.error.status)})`
            }
          );
        } else {
          failApiLogRequest(id, {
            message:
              result.error.error ??
              `RTK Query error (${String(result.error.status ?? 'FETCH_ERROR')})`
          });
        }
      } else {
        completeApiLogRequest(id, {
          status: 200,
          statusText: 'OK',
          body: result.data
        });
      }

      return result;
    } catch (error: unknown) {
      const err = error as globalThis.Error;
      failApiLogRequest(id, {
        message: err.message ?? 'RTK Query request failed',
        stack: err.stack
      });
      throw error;
    }
  };
}
