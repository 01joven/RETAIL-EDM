import test from 'node:test';
import assert from 'node:assert/strict';
import { cashDifference, expectedCash, isValidMoney } from '../src/utils/shiftMetrics.js';

test('accepts only non-negative cent-precision shift amounts within the database range', () => {
  assert.equal(isValidMoney(0), true);
  assert.equal(isValidMoney(10.25), true);
  assert.equal(isValidMoney(9999999999.99), true);
  assert.equal(isValidMoney(-0.01), false);
  assert.equal(isValidMoney(1.001), false);
  assert.equal(isValidMoney(Number.MAX_SAFE_INTEGER), false);
  assert.equal(isValidMoney('10.00'), false);
});

test('calculates expected cash using exact cents', () => {
  assert.equal(expectedCash('10.00', '8875.00'), '8885.00');
  assert.equal(expectedCash('10.25', '0.10'), '10.35');
});

test('calculates positive and negative drawer differences', () => {
  assert.equal(cashDifference('8875.00', '8885.00'), '-10.00');
  assert.equal(cashDifference('8885.25', '8885.00'), '0.25');
});
