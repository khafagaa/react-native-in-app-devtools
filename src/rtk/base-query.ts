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

type QueryReturnValue = {
  data?: unknown;
  error?: {
    status?: number | string;
    data?: unknown;
    error?: string;
  };
  meta?: unknown;
};

/** Matches RTK Query: base queries may return a value or a Promise. */
type MaybePromise<T> = T | PromiseLike<T>;

/**
 * Loose base-query shape so RTK's real `BaseQueryFn` (with `BaseQueryApi`) is
 * assignable. Do not type `api` as `unknown` — that breaks under function
 * parameter contravariance. Return `MaybePromise` (not only `Promise`) so sync
 * results like `{ error }` match RTK's `fetchBaseQuery`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBaseQueryFn = (
  args: any,
  api: any,
  extraOptions: any
) => MaybePromise<QueryReturnValue>;

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

/**
 * Wraps an RTK Query base query (typically `fetchBaseQuery`) to log requests
 * in the inspector. Preserves the caller's base-query type exactly.
 */
export function withBaseQuery<TBaseQuery extends AnyBaseQueryFn>(
  baseQuery: TBaseQuery,
  options?: WithBaseQueryOptions
): TBaseQuery {
  // Always return a wrapper and check enabled at *request* time.
  // Module-load wrapping often runs before ApiInspector.init(), so an
  // early isEnabled() check would permanently skip logging.
  const wrapped = (async (
    args: Parameters<TBaseQuery>[0],
    api: Parameters<TBaseQuery>[1],
    extraOptions: Parameters<TBaseQuery>[2]
  ) => {
    if (!ApiInspector.isEnabled()) {
      return baseQuery(args, api, extraOptions);
    }

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
  }) as unknown as TBaseQuery;

  return wrapped;
}
