import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDateRange } from '../src/utils/dateRange.js';

test('parses valid inclusive start and exclusive end timestamps', () => {
  assert.deepEqual(parseDateRange({ from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' }), {
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-02T00:00:00.000Z'
  });
});

test('rejects invalid and reversed date ranges', () => {
  assert.equal(parseDateRange({ from: 'not-a-date' }).error, 'from and to must be valid date strings');
  assert.equal(parseDateRange({ from: '2026-01-03', to: '2026-01-02' }).error, 'from must be earlier than to');
});

test('allows an open-ended range', () => {
  assert.deepEqual(parseDateRange({ from: '2026-01-01' }), {
    from: '2026-01-01T00:00:00.000Z',
    to: null
  });
});
