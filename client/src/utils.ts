export function number(v: number | null | undefined, digits = 1) {
  return v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function calculator(distance: number, mileage: number, price: number) {
  if (![distance, mileage, price].every((v) => Number.isFinite(v) && v > 0))
    throw Error('All inputs must be positive numbers.');
  return {
    litres: distance / mileage,
    cost: (distance / mileage) * price,
    costPerKm: price / mileage,
  };
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dateBefore(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function sanitizeForm(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== undefined));
}
