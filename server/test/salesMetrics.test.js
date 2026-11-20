import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSalesMetrics } from '../src/utils/salesMetrics.js';

test('gross and net sales exclude voids and subtract full refunds once', () => {
  assert.deepEqual(calculateSalesMetrics({
    completedSales: '1200.00',
    refundedSales: '200.00',
    voidedSales: '75.00'
  }), {
    grossSales: 1400,
    netSales: 1200,
    refundedSales: 200,
    voidedSales: 75
  });
});

test('sales metrics are zero when the period has no transactions', () => {
  assert.deepEqual(calculateSalesMetrics({}), {
    grossSales: 0,
    netSales: 0,
    refundedSales: 0,
    voidedSales: 0
  });
});
