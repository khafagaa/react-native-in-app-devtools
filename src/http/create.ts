import { ApiInspector } from '../core/api-inspector';
import {
  completeApiLogRequest,
  failApiLogRequest,
  startApiLogRequest,
  updateApiLogRequestFailure
} from '../core/http-log';

export type ApiInspectorHttpLogRequest = {
  method: string;
  url: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  queryParams?: Record<string, string>;
};

export type ApiInspectorHttpLogResponse = {
  status: number;
  statusText?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
};

export type ApiInspectorHttpLogError = {
  message: string;
  code?: string;
  stack?: string;
};

/**
 * Lifecycle handle for a single native (fetch/XHR) HTTP attempt.
 * When the inspector is disabled, methods are no-ops and `id` is `null`.
 */
export type ApiInspectorHttpLogHandle = {
  id: string | null;
  /** Mark the request as HTTP success (typically 2xx). */
  complete: (response: ApiInspectorHttpLogResponse) => void;
  /**
   * Mark the request as failed.
   * Pass `response` when an HTTP status/body is available (4xx/5xx);
   * omit it for transport failures with no response.
   */
  fail: (
    error: ApiInspectorHttpLogError,
    response?: ApiInspectorHttpLogResponse
  ) => void;
};

const DISABLED_HANDLE: ApiInspectorHttpLogHandle = {
  id: null,
  complete: () => undefined,
  fail: () => undefined
};

/**
 * Start a network log entry for non-Axios transports (native fetch / XHR).
 * Enable checks, redaction, timing, and store updates stay inside the package.
 */
export function createApiInspectorHttpLog(
  request: ApiInspectorHttpLogRequest
): ApiInspectorHttpLogHandle {
  if (!ApiInspector.isEnabled()) {
    return DISABLED_HANDLE;
  }

  const id = startApiLogRequest({
    method: request.method,
    url: request.url,
    queryParams: request.queryParams,
    headers: request.headers,
    body: request.body
  });

  return {
    id,
    complete(response) {
      completeApiLogRequest(id, response);
    },
    fail(error, response) {
      if (response) {
        updateApiLogRequestFailure(id, response, error);
        return;
      }
      failApiLogRequest(id, error);
    }
  };
}
