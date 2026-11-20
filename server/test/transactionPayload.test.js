import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTransactionPayload } from '../src/utils/transactionPayload.js';

const validPayload = {
  externalId: 'STORE-01-000123',
  occurredAt: '2026-11-18T10:00:00Z',
  salesChannel: 'ecommerce',
  paymentMethod: 'gcash',
  items: [{ productId: 1, quantity: 2 }]
};

test('accepts supported POS channel and payment metadata', () => {
  assert.equal(validateTransactionPayload(validPayload), null);
});

test('rejects payment-card fields at top level and nested in item data', () => {
  assert.match(validateTransactionPayload({ ...validPayload, card_number: '4111111111111111' }), /must not be sent/);
  assert.match(validateTransactionPayload({
    ...validPayload,
    items: [{ productId: 1, quantity: 1, cvv: '123' }]
  }), /must not be sent/);
});

test('rejects unsupported sales channels', () => {
  assert.match(validateTransactionPayload({ ...validPayload, salesChannel: 'marketplace' }), /salesChannel/);
});

test('accepts an optional customer id and rejects invalid ids', () => {
  assert.equal(validateTransactionPayload({ ...validPayload, customerId: 7 }), null);
  assert.equal(validateTransactionPayload({ ...validPayload, customerId: '7' }), null);
  assert.equal(validateTransactionPayload({ ...validPayload, customerId: null }), null);
  assert.match(validateTransactionPayload({ ...validPayload, customerId: 0 }), /customerId/);
  assert.match(validateTransactionPayload({ ...validPayload, customerId: true }), /customerId/);
});
