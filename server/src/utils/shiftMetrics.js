const MAX_AMOUNT_CENTS = 999999999999;

export function isValidMoney(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) &&
    cents <= MAX_AMOUNT_CENTS &&
    Math.abs(value * 100 - cents) < 1e-6;
}

function toCents(value) {
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function fromCents(cents) {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

export function expectedCash(openingFloat, cashSales) {
  return fromCents(toCents(openingFloat) + toCents(cashSales));
}

export function cashDifference(closingCash, expected) {
  return fromCents(toCents(closingCash) - toCents(expected));
}
