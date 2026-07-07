import type { ApiLogError, ApiLogRequest, ApiLogResponse } from './types';
import { clearApiLogEntries } from './store';
export {
  completeApiLogRequest,
  failApiLogRequest,
  startApiLogRequest,
  updateApiLogRequestFailure,
  type StartRequestInput
} from './http-log';

export function clearApiLogger(): void {
  clearApiLogEntries();
}

export type { ApiLogRequest, ApiLogResponse, ApiLogError };
