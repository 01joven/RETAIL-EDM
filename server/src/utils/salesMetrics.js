export function calculateSalesMetrics({ completedSales, refundedSales, voidedSales }) {
  const completed = Number(completedSales || 0);
  const refunded = Number(refundedSales || 0);
  const voided = Number(voidedSales || 0);
  const grossSales = completed + refunded;

  return {
    grossSales,
    netSales: grossSales - refunded,
    refundedSales: refunded,
    voidedSales: voided
  };
}
