import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';
import {
  completeApiLogRequest,
  failApiLogRequest,
  startApiLogRequest,
  updateApiLogRequestFailure
} from '../core/service';

type InspectorAxiosConfig = InternalAxiosRequestConfig & {
  _apiInspectorId?: string;
};

function headersToRecord(
  headers: unknown
): Record<string, unknown> | undefined {
  if (!headers) return undefined;
  if (
    typeof headers === 'object' &&
    headers !== null &&
    'toJSON' in headers &&
    typeof (headers as { toJSON: () => unknown }).toJSON === 'function'
  ) {
    return (headers as { toJSON: () => Record<string, unknown> }).toJSON();
  }
  if (typeof headers === 'object' && headers !== null) {
    return { ...(headers as Record<string, unknown>) };
  }
  return undefined;
}

function buildRequestUrl(
  config: InternalAxiosRequestConfig,
  clientBaseURL: string
): string {
  const base = String(config.baseURL ?? clientBaseURL ?? '').replace(/\/$/, '');
  const path = String(config.url ?? '');
  let full = /^https?:\/\//i.test(path)
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const params = config.params;
  if (params && typeof params === 'object') {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(
      params as Record<string, unknown>
    )) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        value.forEach(item => search.append(key, String(item)));
      } else {
        search.append(key, String(value));
      }
    }
    const query = search.toString();
    if (query) {
      full += full.includes('?') ? `&${query}` : `?${query}`;
    }
  }

  return full;
}

function queryParamsFromConfig(
  config: InternalAxiosRequestConfig
): Record<string, string> | undefined {
  const params = config.params;
  if (!params || typeof params !== 'object') return undefined;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    params as Record<string, unknown>
  )) {
    if (value == null) continue;
    out[key] = Array.isArray(value)
      ? value.map(String).join(',')
      : String(value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function attachApiInspectorInterceptor(
  instance: AxiosInstance,
  clientBaseURL: string
): void {
  instance.interceptors.request.use(
    (config: InspectorAxiosConfig): InspectorAxiosConfig => {
      const method = String(config.method ?? 'get').toUpperCase();
      const url = buildRequestUrl(config, clientBaseURL);
      const id = startApiLogRequest({
        method,
        url,
        queryParams: queryParamsFromConfig(config),
        headers: headersToRecord(config.headers),
        body: config.data
      });
      config._apiInspectorId = id;
      return config;
    }
  );

  instance.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
      const config = response.config as InspectorAxiosConfig;
      const id = config._apiInspectorId;
      if (id) {
        completeApiLogRequest(id, {
          status: response.status,
          statusText: response.statusText,
          headers: headersToRecord(response.headers),
          body: response.data
        });
      }
      return response;
    },
    (error: AxiosError): Promise<never> => {
      const config = error.config as InspectorAxiosConfig | undefined;
      const id = config?._apiInspectorId;
      if (id) {
        if (error.response) {
          updateApiLogRequestFailure(
            id,
            {
              status: error.response.status,
              statusText: error.response.statusText,
              headers: headersToRecord(error.response.headers),
              body: error.response.data
            },
            {
              message: error.message,
              code: error.code,
              stack: error.stack
            }
          );
        } else {
          failApiLogRequest(id, {
            message: error.message,
            code: error.code,
            stack: error.stack
          });
        }
      }
      return Promise.reject(error);
    }
  );
}
