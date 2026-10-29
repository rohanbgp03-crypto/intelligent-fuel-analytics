import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = { type: Schema.Types.ObjectId, required: true, index: true };
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxLength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    settings: {
      currency: { type: String, enum: ['INR'], default: 'INR' },
      efficiencyUnit: { type: String, enum: ['km/L', 'L/100km'], default: 'km/L' },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);
const sessionSchema = new Schema(
  {
    user: { ...ref, ref: 'User' },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const vehicleSchema = new Schema(
  {
    owner: { ...ref, ref: 'User' },
    name: { type: String, required: true },
    registration: String,
    type: { type: String, enum: ['car', 'suv', 'motorbike', 'van', 'truck'], required: true },
    make: String,
    model: String,
    year: { type: Number, min: 1950, max: 2100 },
    fuelType: { type: String, enum: ['petrol', 'diesel', 'hybrid'], required: true },
    engineL: { type: Number, min: 0.05, max: 20 },
    weightKg: { type: Number, min: 50, max: 50000 },
    expectedMileage: { type: Number, min: 0.1, max: 150 },
    odometer: { type: Number, min: 0, max: 10000000 },
    notes: String,
  },
  { timestamps: true },
);
const tripSchema = new Schema(
  {
    owner: { ...ref, ref: 'User' },
    vehicle: { ...ref, ref: 'Vehicle' },
    date: { type: String, required: true },
    startOdometer: Number,
    endOdometer: Number,
    distanceKm: { type: Number, min: 0.1, required: true },
    fuelL: { type: Number, min: 0.01, required: true },
    fuelSource: { type: String, enum: ['measured', 'estimated'], required: true },
    pricePerL: { type: Number, min: 0.01, required: true },
    durationMinutes: { type: Number, min: 0.1, max: 10000 },
    avgSpeed: { type: Number, min: 1, max: 200 },
    idleMinutes: { type: Number, min: 0, max: 2000 },
    traffic: { type: String, enum: ['light', 'moderate', 'heavy'] },
    road: { type: String, enum: ['city', 'highway', 'mixed'] },
    weather: { type: String, enum: ['clear', 'rain', 'cold', 'hot'] },
    notes: String,
  },
  { timestamps: true },
);
tripSchema.index({ owner: 1, date: -1, vehicle: 1 });
tripSchema.index({ owner: 1, vehicle: 1, date: 1, distanceKm: 1, fuelL: 1 }, { unique: true });
const fuelSchema = new Schema(
  {
    owner: { ...ref, ref: 'User' },
    vehicle: { ...ref, ref: 'Vehicle' },
    date: { type: String, required: true },
    litres: { type: Number, min: 0.01, required: true },
    pricePerL: { type: Number, min: 0.01, required: true },
    odometer: { type: Number, min: 0, required: true },
    fullTank: { type: Boolean, required: true },
    station: String,
    notes: String,
  },
  { timestamps: true },
);
fuelSchema.index({ owner: 1, date: -1, vehicle: 1 });
fuelSchema.index({ vehicle: 1, date: 1, odometer: 1 }, { unique: true });
const predictionSchema = new Schema(
  {
    owner: { ...ref, ref: 'User' },
    vehicle: { ...ref, ref: 'Vehicle' },
    inputs: Schema.Types.Mixed,
    result: Schema.Types.Mixed,
    actualMileage: Number,
    trip: { type: Schema.Types.ObjectId, ref: 'Trip' },
  },
  { timestamps: true },
);
predictionSchema.index({ owner: 1, createdAt: -1 });
export const User = mongoose.model('User', userSchema),
  Session = mongoose.model('Session', sessionSchema),
  Vehicle = mongoose.model('Vehicle', vehicleSchema),
  Trip = mongoose.model('Trip', tripSchema),
  FuelLog = mongoose.model('FuelLog', fuelSchema),
  Prediction = mongoose.model('Prediction', predictionSchema);
