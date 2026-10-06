import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiInspector } from '../../core/api-inspector';
import { clearApiLogEntries, getApiLogEntries } from '../../core/store';
import { createApiInspectorHttpLog } from '../create';

function resetInspector(enabled: boolean): void {
  clearApiLogEntries();
  ApiInspector.init({
    enabled,
    maxEntries: 50,
    redaction: { enabled: true }
  });
}

test('createApiInspectorHttpLog is a no-op when inspector is disabled', () => {
  resetInspector(false);
  const handle = createApiInspectorHttpLog({
    method: 'POST',
    url: 'https://example.test/token',
    body: 'client_secret=super-secret'
  });
  assert.equal(handle.id, null);
  handle.complete({ status: 200, body: { access_token: 'tok' } });
  handle.fail({ message: 'boom' });
  assert.equal(getApiLogEntries().length, 0);
});

test('createApiInspectorHttpLog completes 2xx as success', () => {
  resetInspector(true);
  const handle = createApiInspectorHttpLog({
    method: 'POST',
    url: 'https://operate.example/v2/process-instances',
    headers: { Authorization: 'Bearer secret-token' },
    body: { processDefinitionId: 'MOJ_IM_v2' }
  });
  assert.ok(handle.id);
  handle.complete({
    status: 200,
    statusText: 'OK',
    body: { processInstanceKey: '123' }
  });

  const [entry] = getApiLogEntries();
  assert.equal(entry.status, 'success');
  assert.equal(entry.statusCode, 200);
  assert.equal(entry.method, 'POST');
  assert.equal(
    entry.request.headers?.Authorization,
    '***REDACTED***'
  );
  assert.equal(
    (entry.response?.body as { processInstanceKey?: string })?.processInstanceKey,
    '123'
  );
  assert.ok(typeof entry.durationMs === 'number');
});

test('createApiInspectorHttpLog fails 4xx/5xx with response body', () => {
  resetInspector(true);
  const handle = createApiInspectorHttpLog({
    method: 'POST',
    url: 'https://operate.example/v2/variables/search',
    body: { filter: {} }
  });
  handle.fail(
    { message: 'Request failed with status code 503' },
    {
      status: 503,
      statusText: 'Service Unavailable',
      body: { message: 'BPM unavailable' }
    }
  );

  const [entry] = getApiLogEntries();
  assert.equal(entry.status, 'failed');
  assert.equal(entry.statusCode, 503);
  assert.equal(entry.error?.message, 'Request failed with status code 503');
  assert.deepEqual(entry.response?.body, { message: 'BPM unavailable' });
});

test('createApiInspectorHttpLog fails transport errors without response', () => {
  resetInspector(true);
  const handle = createApiInspectorHttpLog({
    method: 'POST',
    url: 'https://operate.example/v2/process-instances',
    body: {}
  });
  handle.fail({
    message: 'Network request failed',
    code: 'ERR_NETWORK'
  });

  const [entry] = getApiLogEntries();
  assert.equal(entry.status, 'failed');
  assert.equal(entry.error?.message, 'Network request failed');
  assert.equal(entry.error?.code, 'ERR_NETWORK');
  assert.equal(entry.response, undefined);
});

test('createApiInspectorHttpLog redacts form-urlencoded secrets and token bodies', () => {
  resetInspector(true);
  const handle = createApiInspectorHttpLog({
    method: 'POST',
    url: 'https://keycloak.example/token',
    headers: {
      Authorization: 'Basic abc',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'client_id=moj&client_secret=super-secret&grant_type=client_credentials'
  });
  handle.complete({
    status: 200,
    body: {
      access_token: 'eyJhbGciOi...',
      refresh_token: 'refresh-value',
      expires_in: 300
    }
  });

  const [entry] = getApiLogEntries();
  assert.equal(entry.request.headers?.Authorization, '***REDACTED***');
  assert.equal(
    entry.request.body,
    'client_id=moj&client_secret=***REDACTED***&grant_type=client_credentials'
  );
  const body = entry.response?.body as Record<string, unknown>;
  assert.equal(body.access_token, '***REDACTED***');
  assert.equal(body.refresh_token, '***REDACTED***');
  assert.equal(body.expires_in, 300);
});
