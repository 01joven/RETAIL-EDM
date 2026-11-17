export function parseDateRange(query) {
  const rawFrom = query.from;
  const rawTo = query.to;
  if ((rawFrom !== undefined && typeof rawFrom !== 'string') ||
      (rawTo !== undefined && typeof rawTo !== 'string')) {
    return { error: 'from and to must be valid date strings' };
  }
  const fromDate = rawFrom === undefined ? null : new Date(rawFrom);
  const toDate = rawTo === undefined ? null : new Date(rawTo);
  if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
    return { error: 'from and to must be valid date strings' };
  }
  if (fromDate && toDate && fromDate >= toDate) {
    return { error: 'from must be earlier than to' };
  }
  return {
    from: fromDate?.toISOString() ?? null,
    to: toDate?.toISOString() ?? null
  };
}
