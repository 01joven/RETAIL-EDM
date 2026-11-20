import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from '../src/middleware/auth.js';

function requestRole(role, allowedRoles) {
  const result = { statusCode: 200, body: null, continued: false };
  const req = { user: role ? { role } : null };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };
  authorize(...allowedRoles)(req, res, () => { result.continued = true; });
  return result;
}

test('admin-only routes reject cashiers and unauthenticated requests', () => {
  assert.equal(requestRole('cashier', ['admin']).statusCode, 403);
  assert.equal(requestRole(null, ['admin']).statusCode, 403);
});

test('admin-only routes allow admins and cashier sale routes allow both roles', () => {
  assert.equal(requestRole('admin', ['admin']).continued, true);
  assert.equal(requestRole('admin', ['admin', 'cashier']).continued, true);
  assert.equal(requestRole('cashier', ['admin', 'cashier']).continued, true);
});

test('only the two supported roles are authorized', () => {
  assert.equal(requestRole('manager', ['admin', 'cashier']).statusCode, 403);
});

test('only cashiers are authorized to manage cashier shifts', () => {
  assert.equal(requestRole('admin', ['cashier']).statusCode, 403);
  assert.equal(requestRole('cashier', ['cashier']).continued, true);
});
