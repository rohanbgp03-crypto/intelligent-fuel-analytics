import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Vehicle, Trip, FuelLog } from './models.js';
if (process.env.NODE_ENV === 'production') {
  console.error('Development seed is disabled in production.');
  process.exit(1);
}
if (
  !process.env.SEED_EMAIL ||
  !process.env.SEED_PASSWORD ||
  process.env.SEED_PASSWORD.length < 10
) {
  console.error(
    'Set SEED_EMAIL and a SEED_PASSWORD of at least 10 characters in .env. No default password is supplied.',
  );
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ifca');
  let u = await User.findOne({ email: process.env.SEED_EMAIL.toLowerCase() });
  if (!u)
    u = await User.create({
      name: 'Synthetic Demo',
      email: process.env.SEED_EMAIL,
      passwordHash: await bcrypt.hash(process.env.SEED_PASSWORD, 12),
    });
  if (await Vehicle.exists({ owner: u._id })) {
    console.log('This account already has vehicles. Seed skipped; no records overwritten.');
    process.exitCode = 0;
  } else {
    let list = [];
    for (const [name, engineL, weightKg, type] of [
      ['Demo Hatchback', 1.2, 1050, 'car'],
      ['Demo SUV', 2, 1750, 'suv'],
      ['Demo Commuter', 0.2, 160, 'motorbike'],
    ])
      list.push(
        await Vehicle.create({
          owner: u._id,
          name,
          type,
          engineL,
          weightKg,
          fuelType: 'petrol',
          odometer: 10000,
          notes: 'SYNTHETIC DEVELOPMENT VEHICLE — not a real vehicle.',
        }),
      );
    let trips = [];
    for (let i = 0; i < 90; i++) {
      let d = new Date();
      d.setDate(d.getDate() - 89 + i);
      let vehicle = list[i % 3],
        distanceKm = 40 + ((i * 17) % 150),
        speed = 35 + ((i * 7) % 55),
        idle = (i % 5) * 4,
        rate =
          1.2 +
          vehicle.engineL * 1.6 +
          vehicle.weightKg * 0.0012 +
          ((speed - 65) / 35) ** 2 * 0.65 +
          0.6;
      trips.push({
        owner: u._id,
        vehicle: vehicle._id,
        date: d.toISOString().slice(0, 10),
        distanceKm,
        fuelL: +((distanceKm * rate) / 100 + idle * 0.008).toFixed(2),
        fuelSource: 'estimated',
        pricePerL: 100 + (i % 7),
        avgSpeed: speed,
        idleMinutes: idle,
        durationMinutes: (distanceKm / speed) * 60 + idle,
        traffic: 'moderate',
        road: i % 2 ? 'city' : 'highway',
        weather: 'clear',
        notes: 'SYNTHETIC DEVELOPMENT TRIP — all demo fuel quantities are estimated.',
      });
    }
    await Trip.insertMany(trips);
    let logs = [];
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 9; i++) {
        let d = new Date();
        d.setDate(d.getDate() - 85 + i * 10);
        logs.push({
          owner: u._id,
          vehicle: list[j]._id,
          date: d.toISOString().slice(0, 10),
          litres: j === 2 ? 5 : 25,
          pricePerL: 105,
          odometer: 8000 + i * 350,
          fullTank: i % 2 === 0,
          station: 'Synthetic demonstration station',
          notes: 'SYNTHETIC DEVELOPMENT REFILL',
        });
      }
    await FuelLog.insertMany(logs);
    console.log(
      'Created 3 synthetic vehicles, 90 estimated synthetic trips and 27 synthetic refills. Sign in with the seed credentials from your .env.',
    );
  }
} catch (e) {
  console.error('Seed failed:', e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
