import { z } from 'zod';
const n = (min, max) => z.number().finite().min(min).max(max),
  text = (max = 500) => z.string().trim().max(max),
  id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record identifier');
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    'Invalid calendar date',
  );
export const register = z
  .object({
    name: text(80).min(1),
    email: z
      .string()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(10).max(128),
  })
  .strict();
export const login = register
  .pick({ email: true, password: true })
  .extend({ password: z.string().min(1).max(128) });
export const vehicle = z
  .object({
    name: text(80).min(1),
    registration: text(30).optional(),
    type: z.enum(['car', 'suv', 'motorbike', 'van', 'truck']),
    make: text(60).optional(),
    model: text(60).optional(),
    year: n(1950, 2100).int().optional(),
    fuelType: z.enum(['petrol', 'diesel', 'hybrid']),
    engineL: n(0.05, 20).optional(),
    weightKg: n(50, 50000).optional(),
    expectedMileage: n(0.1, 150).optional(),
    odometer: n(0, 10000000),
    notes: text().optional(),
  })
  .strict();
export const trip = z
  .object({
    vehicle: id,
    date,
    startOdometer: n(0, 10000000).optional(),
    endOdometer: n(0, 10000000).optional(),
    distanceKm: n(0.1, 10000),
    fuelL: n(0.01, 3000),
    fuelSource: z.enum(['measured', 'estimated']),
    pricePerL: n(0.01, 2000),
    durationMinutes: n(0.1, 10000).optional(),
    avgSpeed: n(1, 200).optional(),
    idleMinutes: n(0, 2000).optional(),
    traffic: z.enum(['light', 'moderate', 'heavy']).optional(),
    road: z.enum(['city', 'highway', 'mixed']).optional(),
    weather: z.enum(['clear', 'rain', 'cold', 'hot']).optional(),
    notes: text().optional(),
  })
  .strict()
  .superRefine((v, c) => {
    if ((v.startOdometer === undefined) !== (v.endOdometer === undefined))
      c.addIssue({ code: 'custom', message: 'Supply both odometer readings or neither' });
    if (
      v.startOdometer !== undefined &&
      v.endOdometer !== undefined &&
      (v.endOdometer <= v.startOdometer ||
        Math.abs(v.endOdometer - v.startOdometer - v.distanceKm) > 0.1)
    )
      c.addIssue({
        code: 'custom',
        message: 'Odometer difference must match distance, with end greater than start',
      });
    if (
      v.durationMinutes !== undefined &&
      v.idleMinutes !== undefined &&
      v.idleMinutes > v.durationMinutes
    )
      c.addIssue({ code: 'custom', message: 'Idle time cannot exceed driving duration' });
  });
export const fuelLog = z
  .object({
    vehicle: id,
    date,
    litres: n(0.01, 3000),
    pricePerL: n(0.01, 2000),
    odometer: n(0, 10000000),
    fullTank: z.boolean(),
    station: text(100).optional(),
    notes: text().optional(),
  })
  .strict();
export const settings = z
  .object({
    name: text(80).min(1),
    currency: z.literal('INR'),
    efficiencyUnit: z.enum(['km/L', 'L/100km']),
    notifications: z.boolean(),
  })
  .strict();
export const password = z
  .object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) })
  .strict();
export const prediction = z
  .object({
    vehicle: id,
    tripId: id.optional(),
    distanceKm: n(0.1, 10000),
    avgSpeed: n(1, 160),
    idleMinutes: n(0, 240),
    traffic: z.enum(['light', 'moderate', 'heavy']),
    road: z.enum(['city', 'highway', 'mixed']),
  })
  .strict();
export const filter = z
  .object({
    from: date.optional(),
    to: date.optional(),
    vehicle: id.optional(),
    q: text(100).optional(),
    sort: z.enum(['date', 'distance', 'cost', 'efficiency']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(15),
  })
  .strict()
  .refine((x) => !x.from || !x.to || x.from <= x.to, 'Start date must precede end date');
export function parse(schema, input) {
  const r = schema.safeParse(input);
  if (!r.success) {
    const e = new Error(
      r.error.issues
        .map((x) => (x.path.join('.') ? x.path.join('.') + ': ' : '') + x.message)
        .join('; '),
    );
    e.status = 400;
    throw e;
  }
  return r.data;
}
