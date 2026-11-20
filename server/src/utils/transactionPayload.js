const prohibitedCardFields = new Set([
  'pan',
  'cardnumber',
  'primaryaccountnumber',
  'cvv',
  'cvc',
  'securitycode',
  'cardsecuritycode',
  'cardverificationvalue',
  'cardverificationcode',
  'trackdata',
  'track1data',
  'track2data',
  'pin',
  'pinblock',
  'carddata',
  'cardholderdata',
  'magneticstripe',
  'magstripe',
  'chipdata'
]);

function containsCardData(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    return prohibitedCardFields.has(normalizedKey) || containsCardData(child);
  });
}

export function validateTransactionPayload(body) {
  if (containsCardData(body)) {
    return 'Payment-card data must not be sent to this API';
  }
  const { externalId, occurredAt, items } = body;
  if (typeof externalId !== 'string' || !externalId.trim() || externalId.length > 128 ||
      typeof occurredAt !== 'string' || Number.isNaN(Date.parse(occurredAt)) ||
      !Array.isArray(items) || items.length < 1 || items.length > 100) {
    return 'A POS reference, valid timestamp, and 1-100 items are required';
  }
  for (const item of items) {
    if (!item || typeof item !== 'object' ||
        !Number.isSafeInteger(Number(item.productId)) || Number(item.productId) < 1 ||
        !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) {
      return 'Each item must include a valid product id and quantity from 1 to 10000';
    }
  }
  if (body.paymentMethod !== undefined &&
      body.paymentMethod !== 'cash' &&
      body.paymentMethod !== 'gcash') {
    return 'paymentMethod must be cash or gcash';
  }
  if (body.salesChannel !== undefined &&
      body.salesChannel !== 'store' &&
      body.salesChannel !== 'ecommerce') {
    return 'salesChannel must be store or ecommerce';
  }
  if (body.tendered !== undefined &&
      (!/^\d+(\.\d{1,2})?$/.test(String(body.tendered)) ||
       Number(body.tendered) < 0)) {
    return 'tendered must be a valid non-negative amount';
  }
  if (body.customerId !== undefined && body.customerId !== null) {
    const rawCustomerId = body.customerId;
    const customerId = typeof rawCustomerId === 'string' && /^\d+$/.test(rawCustomerId)
      ? Number(rawCustomerId)
      : rawCustomerId;
    if (!Number.isSafeInteger(customerId) || customerId < 1) {
      return 'customerId must be a valid positive integer';
    }
  }
  return null;
}
