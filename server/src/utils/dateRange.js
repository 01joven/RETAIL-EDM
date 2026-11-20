function parseDateString(value) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day) {
      return null;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateRange(query) {
  const rawFrom = query.from;
  const rawTo = query.to;
  if ((rawFrom !== undefined && typeof rawFrom !== 'string') ||
      (rawTo !== undefined && typeof rawTo !== 'string')) {
    return { error: 'from and to must be valid date strings' };
  }
  const fromDate = rawFrom === undefined ? null : parseDateString(rawFrom);
  const toDate = rawTo === undefined ? null : parseDateString(rawTo);
  if ((rawFrom !== undefined && fromDate === null) || (rawTo !== undefined && toDate === null)) {
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
