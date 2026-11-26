export const decimal = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? String(value) : null;
};

export const positiveInteger = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

/** A stock count must be explicitly supplied as a whole number, not a flag. */
export const stockCount = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 && count <= 2147483647 ? count : null;
};

export const stockAvailability = (value: unknown, count: number | null) =>
  count !== null ? (count > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK')
    : typeof value === 'boolean' ? (value ? 'IN_STOCK' : 'OUT_OF_STOCK') : 'UNKNOWN';

export const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const activeSale = (flag: unknown, salePrice: string | null, start: string | null, end: string | null, observedAt: Date) => {
  if (flag !== true || salePrice === null) return false;
  const startTime = start ? new Date(start) : null;
  const endTime = end ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(end) ? `${end}T23:59:59.999Z` : end) : null;
  if (startTime && (Number.isNaN(startTime.valueOf()) || startTime > observedAt)) return false;
  if (endTime && (Number.isNaN(endTime.valueOf()) || endTime < observedAt)) return false;
  return true;
};
