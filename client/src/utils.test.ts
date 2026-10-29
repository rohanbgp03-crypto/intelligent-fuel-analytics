import { describe, expect, it } from 'vitest';
import { calculator, number, sanitizeForm } from './utils';
describe('fuel calculator and form helpers', () => {
  it('computes litres, cost and cost per km', () => {
    expect(calculator(120, 15, 105)).toEqual({ litres: 8, cost: 840, costPerKm: 7 });
  });
  it('rejects invalid denominators and negative values', () => {
    for (const v of [0, -2, NaN, Infinity]) expect(() => calculator(100, v, 105)).toThrow();
  });
  it('formats missing analytics honestly', () => {
    expect(number(null)).toBe('—');
  });
  it('omits blank optional fields without losing zero', () => {
    expect(sanitizeForm({ idle: 0, notes: '', speed: undefined })).toEqual({ idle: 0 });
  });
});
