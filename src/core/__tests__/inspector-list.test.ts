import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiInspector } from '../api-inspector';
import { buildApiLogExport } from '../export';
import { redactUnknown } from '../redaction';
import {
  clearApiLogEntries,
  getApiLogEntries,
  removeApiLogEntry
} from '../store';
import {
  completeApiLogRequest,
  startApiLogRequest
} from '../http-log';

function resetInspector(): void {
  clearApiLogEntries();
  ApiInspector.init({ enabled: true, maxEntries: 50, redaction: { enabled: true } });
}

test('large and deeply nested bodies are kept in full, without [Truncated]', () => {
  resetInspector();
  let deep: Record<string, unknown> = { leaf: 'value' };
  for (let i = 0; i < 20; i++) deep = { level: deep };
  const big = 'x'.repeat(50_000);

  const id = startApiLogRequest({ method: 'POST', url: 'https://a.test', body: { deep, big } });
  completeApiLogRequest(id, { status: 200, body: { deep, big } });

  const [entry] = getApiLogEntries();
  const exported = JSON.stringify(entry);
  assert.ok(!exported.includes('[Truncated]'));
  assert.ok(!exported.includes('[truncated]'));
  assert.equal((entry.response?.body as { big: string }).big.length, 50_000);
  assert.equal(JSON.stringify(entry.request.body).includes('"leaf":"value"'), true);
});

test('circular references do not recurse forever', () => {
  resetInspector();
  const node: Record<string, unknown> = { name: 'loop' };
  node.self = node;
  const out = redactUnknown(node) as Record<string, unknown>;
  assert.equal(out.name, 'loop');
  assert.equal(out.self, '[Circular]');
});

test('removeApiLogEntry drops the entry and a late completion does not resurrect it', () => {
  resetInspector();
  const keep = startApiLogRequest({ method: 'GET', url: 'https://keep.test' });
  const drop = startApiLogRequest({ method: 'GET', url: 'https://drop.test' });

  removeApiLogEntry(drop);
  completeApiLogRequest(drop, { status: 200 });

  const ids = getApiLogEntries().map(entry => entry.id);
  assert.deepEqual(ids, [keep]);
});

test('export excludes removed requests', () => {
  resetInspector();
  startApiLogRequest({ method: 'GET', url: 'https://keep.test' });
  const dropId = startApiLogRequest({ method: 'GET', url: 'https://secret-drop.test' });
  removeApiLogEntry(dropId);

  const exported = buildApiLogExport(getApiLogEntries());
  assert.ok(exported.includes('https://keep.test'));
  assert.ok(!exported.includes('secret-drop.test'));
  assert.equal(JSON.parse(exported).length, 1);
});
