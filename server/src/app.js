import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { User, Session, Vehicle, Trip, FuelLog, Prediction } from './models.js';
import * as V from './validation.js';
import * as A from './analytics.js';
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
export function createApp(options = {}) {
  const app = express(),
    production = process.env.NODE_ENV === 'production',
    origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    cookie = 'ifca_session';
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers.origin && req.headers.origin !== origin)
        return next(fail(403, 'Request origin is not allowed'));
      if (
        (Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding']) &&
        !req.is('application/json')
      )
        return next(fail(415, 'Use application/json'));
    }
    next();
  });
  app.get('/api/health', (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'database unavailable' }),
  );
  app.use('/api', (req, res, next) =>
    mongoose.connection.readyState === 1
      ? next()
      : next(fail(503, 'Database unavailable. Check MONGODB_URI and start MongoDB.')),
  );
  const authRate = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { message: 'Too many authentication attempts. Try again later.' } },
  });
  app.use('/api/auth', authRate);
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: production,
    path: '/api',
    maxAge: 7 * 24 * 3600000,
  };
  async function session(user, res) {
    let token = crypto.randomBytes(32).toString('hex');
    await Session.create({
      user: user._id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + cookieOptions.maxAge),
    });
    res.cookie(cookie, token, cookieOptions);
  }
  const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, settings: u.settings });
  app.post(
    '/api/auth/register',
    wrap(async (req, res) => {
      const data = V.parse(V.register, req.body);
      if (await User.exists({ email: data.email })) throw fail(409, 'Email is already registered');
      const user = await User.create({
        name: data.name,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
      });
      await session(user, res);
      res.status(201).json(publicUser(user));
    }),
  );
  app.post(
    '/api/auth/login',
    wrap(async (req, res) => {
      const d = V.parse(V.login, req.body),
        u = await User.findOne({ email: d.email }).select('+passwordHash');
      if (!u || !(await bcrypt.compare(d.password, u.passwordHash)))
        throw fail(401, 'Invalid email or password');
      if (req.cookies[cookie]) await Session.deleteOne({ tokenHash: hash(req.cookies[cookie]) });
      await session(u, res);
      res.json(publicUser(u));
    }),
  );
  const auth = wrap(async (req, res, next) => {
    const token = req.cookies[cookie];
    if (!token || typeof token !== 'string') throw fail(401, 'Please sign in');
    const s = await Session.findOne({
      tokenHash: hash(token),
      expiresAt: { $gt: new Date() },
    }).populate('user');
    if (!s?.user) throw fail(401, 'Your session expired. Please sign in');
    req.user = s.user;
    req.session = s;
    next();
  });
  app.use('/api', auth);
  app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));
  app.post(
    '/api/auth/logout',
    wrap(async (req, res) => {
      await Session.deleteOne({ _id: req.session._id });
      res.clearCookie(cookie, { ...cookieOptions, maxAge: undefined });
      res.json({ message: 'Signed out' });
    }),
  );
  app.put(
    '/api/settings',
    wrap(async (req, res) => {
      const d = V.parse(V.settings, req.body);
      req.user.name = d.name;
      req.user.settings = {
        currency: d.currency,
        efficiencyUnit: d.efficiencyUnit,
        notifications: d.notifications,
      };
      await req.user.save();
      res.json(publicUser(req.user));
    }),
  );
  app.put(
    '/api/auth/password',
    wrap(async (req, res) => {
      const d = V.parse(V.password, req.body),
        u = await User.findById(req.user._id).select('+passwordHash');
      if (!(await bcrypt.compare(d.currentPassword, u.passwordHash)))
        throw fail(400, 'Current password is incorrect');
      u.passwordHash = await bcrypt.hash(d.newPassword, 12);
      await u.save();
      await Session.deleteMany({ user: u._id });
      res.clearCookie(cookie, { ...cookieOptions, maxAge: undefined });
      res.json({ message: 'Password changed. Sign in again.' });
    }),
  );
  function oid(id) {
    if (!/^[a-f\d]{24}$/i.test(id)) throw fail(400, 'Invalid record identifier');
    return id;
  }
  async function owned(Model, id, user) {
    const record = await Model.findOne({ _id: oid(id), owner: user._id });
    if (!record) throw fail(404, 'Record not found');
    return record;
  }
  const ownedVehicle = (id, u) => owned(Vehicle, id, u);
  function filters(req) {
    return V.parse(V.filter, req.query);
  }
  function query(user, f) {
    let q = { owner: user._id };
    if (f.vehicle) q.vehicle = f.vehicle;
    if (f.from || f.to)
      q.date = { ...(f.from ? { $gte: f.from } : {}), ...(f.to ? { $lte: f.to } : {}) };
    return q;
  }
  async function capped(Model, q) {
    const count = await Model.countDocuments(q);
    if (count > 10000)
      throw fail(422, 'More than 10,000 records match. Narrow the date or vehicle filters.');
    return Model.find(q).populate('vehicle').lean();
  }
  async function data(req) {
    const f = filters(req),
      q = query(req.user, f);
    const [trips, logs, vehicles] = await Promise.all([
      capped(Trip, q),
      capped(FuelLog, q),
      Vehicle.find({ owner: req.user._id }).lean(),
    ]);
    return { f, trips, logs, vehicles };
  }
  app.get(
    '/api/vehicles',
    wrap(async (req, res) =>
      res.json(await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean()),
    ),
  );
  app.post(
    '/api/vehicles',
    wrap(async (req, res) =>
      res
        .status(201)
        .json(await Vehicle.create({ ...V.parse(V.vehicle, req.body), owner: req.user._id })),
    ),
  );
  app.get(
    '/api/vehicles/:id',
    wrap(async (req, res) => {
      let v = await ownedVehicle(req.params.id, req.user);
      res.json(v);
    }),
  );
  app.put(
    '/api/vehicles/:id',
    wrap(async (req, res) => {
      let v = await ownedVehicle(req.params.id, req.user);
      Object.assign(v, V.parse(V.vehicle, req.body));
      await v.save();
      res.json(v);
    }),
  );
  app.delete(
    '/api/vehicles/:id',
    wrap(async (req, res) => {
      let v = await ownedVehicle(req.params.id, req.user);
      if (
        (await Trip.exists({ vehicle: v._id })) ||
        (await FuelLog.exists({ vehicle: v._id })) ||
        (await Prediction.exists({ vehicle: v._id }))
      )
        throw fail(
          409,
          'This vehicle has history. Delete its trips, fuel logs and predictions before deleting it.',
        );
      await v.deleteOne();
      res.json({ message: 'Vehicle deleted' });
    }),
  );
  app.get(
    '/api/trips',
    wrap(async (req, res) => {
      const f = filters(req);
      let rows = await capped(Trip, query(req.user, f));
      if (f.q) {
        const q = f.q.toLowerCase();
        rows = rows.filter((x) =>
          (x.vehicle.name + ' ' + x.date + ' ' + (x.notes || '')).toLowerCase().includes(q),
        );
      }
      const val = (x) =>
        f.sort === 'distance'
          ? x.distanceKm
          : f.sort === 'cost'
            ? x.fuelL * x.pricePerL
            : f.sort === 'efficiency'
              ? x.distanceKm / x.fuelL
              : x.date;
      rows.sort(
        (a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * (f.order === 'asc' ? 1 : -1),
      );
      res.json({
        items: rows.slice((f.page - 1) * f.limit, f.page * f.limit),
        total: rows.length,
        page: f.page,
        limit: f.limit,
      });
    }),
  );
  async function checkTrip(d, u, exclude) {
    await ownedVehicle(d.vehicle, u);
    if (
      await Trip.exists({
        owner: u._id,
        vehicle: d.vehicle,
        date: d.date,
        distanceKm: d.distanceKm,
        fuelL: d.fuelL,
        ...(exclude ? { _id: { $ne: exclude } } : {}),
      })
    )
      throw fail(409, 'An identical trip already exists');
  }
  app.post(
    '/api/trips',
    wrap(async (req, res) => {
      const d = V.parse(V.trip, req.body);
      await checkTrip(d, req.user);
      res.status(201).json(await Trip.create({ ...d, owner: req.user._id }));
    }),
  );
  app.get(
    '/api/trips/:id',
    wrap(async (req, res) => res.json(await owned(Trip, req.params.id, req.user))),
  );
  app.put(
    '/api/trips/:id',
    wrap(async (req, res) => {
      const t = await owned(Trip, req.params.id, req.user),
        d = V.parse(V.trip, req.body);
      await checkTrip(d, req.user, t._id);
      for (const k of Object.keys(V.trip._def.schema.shape)) t[k] = d[k];
      await t.save();
      await Prediction.updateMany(
        { owner: req.user._id, trip: t._id },
        { $unset: { trip: 1, actualMileage: 1 } },
      );
      res.json(t);
    }),
  );
  app.delete(
    '/api/trips/:id',
    wrap(async (req, res) => {
      const t = await owned(Trip, req.params.id, req.user);
      await Prediction.updateMany(
        { owner: req.user._id, trip: t._id },
        { $unset: { trip: 1, actualMileage: 1 } },
      );
      await t.deleteOne();
      res.json({ message: 'Trip deleted' });
    }),
  );
  async function checkFuel(d, u, exclude) {
    await ownedVehicle(d.vehicle, u);
    const ls = await FuelLog.find({
      owner: u._id,
      vehicle: d.vehicle,
      ...(exclude ? { _id: { $ne: exclude } } : {}),
    }).lean();
    if (
      ls.some(
        (l) =>
          (l.date < d.date && l.odometer > d.odometer) ||
          (l.date > d.date && l.odometer < d.odometer),
      )
    )
      throw fail(400, 'Odometer conflicts with earlier or later refuelling dates');
  }
  app.get(
    '/api/fuel-logs',
    wrap(async (req, res) => {
      const f = filters(req),
        q = query(req.user, f);
      const [items, total] = await Promise.all([
        FuelLog.find(q)
          .populate('vehicle')
          .sort({ date: -1, odometer: -1 })
          .skip((f.page - 1) * f.limit)
          .limit(f.limit)
          .lean(),
        FuelLog.countDocuments(q),
      ]);
      res.json({
        items: items.map((x) => ({ ...x, totalCost: x.litres * x.pricePerL })),
        total,
        page: f.page,
        limit: f.limit,
      });
    }),
  );
  app.post(
    '/api/fuel-logs',
    wrap(async (req, res) => {
      const d = V.parse(V.fuelLog, req.body);
      await checkFuel(d, req.user);
      res.status(201).json(await FuelLog.create({ ...d, owner: req.user._id }));
    }),
  );
  app.put(
    '/api/fuel-logs/:id',
    wrap(async (req, res) => {
      const l = await owned(FuelLog, req.params.id, req.user),
        d = V.parse(V.fuelLog, req.body);
      await checkFuel(d, req.user, l._id);
      for (const k of Object.keys(V.fuelLog.shape)) l[k] = d[k];
      await l.save();
      res.json(l);
    }),
  );
  app.delete(
    '/api/fuel-logs/:id',
    wrap(async (req, res) => {
      await (await owned(FuelLog, req.params.id, req.user)).deleteOne();
      res.json({ message: 'Fuel log deleted' });
    }),
  );
  app.get(
    '/api/analytics/summary',
    wrap(async (req, res) => {
      const { trips, logs, vehicles } = await data(req);
      res.json({
        ...A.summary(trips, logs),
        vehicleCount: vehicles.length,
        recentTrips: [...trips].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
        recommendations: A.recommendations(trips, vehicles),
      });
    }),
  );
  app.get(
    '/api/analytics/fuel-efficiency',
    wrap(async (req, res) => {
      const { trips, logs } = await data(req);
      res.json({
        daily: A.grouped(trips, logs, (x) => x.date),
        weekly: A.grouped(trips, logs, (x) => A.week(x.date)),
        monthly: A.grouped(trips, logs, (x) => x.date.slice(0, 7)),
        tankIntervals: A.tankIntervals(logs),
        conditions: ['traffic', 'road', 'weather'].map((field) => ({
          field,
          groups: A.grouped(
            trips.filter((x) => x[field]),
            [],
            (x) => x[field],
          ).filter((g) => g.trips >= 3),
        })),
        distribution: trips.map((t) => ({
          date: t.date,
          mileage: t.distanceKm / t.fuelL,
          fuelSource: t.fuelSource,
          vehicle: t.vehicle.name,
        })),
      });
    }),
  );
  app.get(
    '/api/analytics/fuel-costs',
    wrap(async (req, res) => {
      const { trips, logs } = await data(req);
      res.json(A.grouped(trips, logs, (x) => x.date));
    }),
  );
  app.get(
    '/api/analytics/vehicle-comparison',
    wrap(async (req, res) => {
      const { trips, logs, vehicles } = await data(req);
      res.json(
        vehicles.map((v) => ({
          id: v._id,
          label: v.name,
          ...A.summary(
            trips.filter((t) => String(t.vehicle._id) === String(v._id)),
            logs.filter((l) => String(l.vehicle._id) === String(v._id)),
          ),
        })),
      );
    }),
  );
  app.get(
    '/api/recommendations',
    wrap(async (req, res) => {
      const { trips, vehicles } = await data(req);
      res.json(A.recommendations(trips, vehicles));
    }),
  );
  const fetchML = options.fetchML || fetch;
  app.get(
    '/api/predictions/model',
    wrap(async (_req, res) => {
      try {
        let r = await fetchML(
          (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001') + '/metadata',
          { signal: AbortSignal.timeout(10000) },
        );
        if (!r.ok) throw Error();
        res.json(await r.json());
      } catch {
        throw fail(
          503,
          'ML service unavailable or model not trained. Start the Python service and run train.py.',
        );
      }
    }),
  );
  app.post(
    '/api/predictions/fuel-efficiency',
    wrap(async (req, res) => {
      const d = V.parse(V.prediction, req.body),
        v = await ownedVehicle(d.vehicle, req.user);
      if (!v.engineL || !v.weightKg)
        throw fail(400, 'Add engine capacity and vehicle weight before predicting');
      let t = d.tripId ? await owned(Trip, d.tripId, req.user) : null;
      if (t && String(t.vehicle) !== String(v._id))
        throw fail(400, 'Trip must belong to the selected vehicle');
      if (t) {
        for (const field of ['distanceKm', 'avgSpeed', 'idleMinutes', 'traffic', 'road'])
          if (t[field] !== undefined && t[field] !== d[field])
            throw fail(400, 'Linked trip conditions must match its recorded ' + field);
      }
      const inputs = {
        vehicle_type: v.type,
        fuel_type: v.fuelType,
        engine_l: v.engineL,
        weight_kg: v.weightKg,
        distance_km: d.distanceKm,
        avg_speed: d.avgSpeed,
        idle_minutes: d.idleMinutes,
        traffic: d.traffic,
        road: d.road,
      };
      let result;
      try {
        const r = await fetchML(
          (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001') + '/predict',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputs),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!r.ok) {
          if (r.status === 422)
            throw fail(422, 'Prediction input outside the ML service supported ranges');
          throw Error();
        }
        result = await r.json();
      } catch (e) {
        if (e.status === 422) throw e;
        throw fail(
          503,
          'Prediction service unavailable. Check the Python service; no estimate was fabricated.',
        );
      }
      if (!Number.isFinite(result.mileage) || result.mileage <= 0)
        throw fail(502, 'ML service returned an invalid prediction');
      const record = await Prediction.create({
        owner: req.user._id,
        vehicle: v._id,
        inputs,
        result,
        ...(t
          ? {
              trip: t._id,
              ...(t.fuelSource === 'measured' ? { actualMileage: t.distanceKm / t.fuelL } : {}),
            }
          : {}),
      });
      res.status(201).json(record);
    }),
  );
  app.get(
    '/api/predictions/history',
    wrap(async (req, res) => {
      const f = filters(req),
        q = {
          owner: req.user._id,
          ...(f.vehicle ? { vehicle: f.vehicle } : {}),
          ...(f.from || f.to
            ? {
                createdAt: {
                  ...(f.from ? { $gte: new Date(f.from) } : {}),
                  ...(f.to ? { $lt: new Date(Date.parse(f.to) + 86400000) } : {}),
                },
              }
            : {}),
        };
      const [items, total] = await Promise.all([
        Prediction.find(q)
          .populate('vehicle')
          .sort({ createdAt: -1 })
          .skip((f.page - 1) * f.limit)
          .limit(f.limit)
          .lean(),
        Prediction.countDocuments(q),
      ]);
      res.json({ items, total, page: f.page, limit: f.limit });
    }),
  );
  app.delete(
    '/api/predictions/:id',
    wrap(async (req, res) => {
      await (await owned(Prediction, req.params.id, req.user)).deleteOne();
      res.json({ message: 'Prediction deleted' });
    }),
  );
  app.get(
    '/api/reports/monthly',
    wrap(async (req, res) => {
      const { trips, logs } = await data(req);
      res.json(A.grouped(trips, logs, (x) => x.date.slice(0, 7)));
    }),
  );
  app.get(
    '/api/reports/export',
    wrap(async (req, res) => {
      const { trips } = await data(req);
      res
        .type('text/csv')
        .attachment('ifca-filtered-trips.csv')
        .send(
          A.csv(
            trips.map((t) => ({
              date: t.date,
              vehicle: t.vehicle.name,
              distance_km: t.distanceKm,
              fuel_l: t.fuelL,
              fuel_source: t.fuelSource,
              price_per_l: t.pricePerL,
              cost: t.fuelL * t.pricePerL,
              mileage_km_l: t.distanceKm / t.fuelL,
            })),
            [
              'date',
              'vehicle',
              'distance_km',
              'fuel_l',
              'fuel_source',
              'price_per_l',
              'cost',
              'mileage_km_l',
            ],
          ),
        );
    }),
  );
  app.use('/api', (_req, _res, next) => next(fail(404, 'API endpoint not found')));
  if (production || process.env.SERVE_CLIENT === 'true') {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
    app.use(express.static(dir));
    app.get('*', (_req, res) => res.sendFile(path.join(dir, 'index.html')));
  }
  app.use((err, _req, res, _next) => {
    let status = err.status || 400;
    if (err.code === 11000) {
      status = 409;
      err.message = 'A record with these identifiers already exists';
    } else if (err instanceof mongoose.Error || err.name === 'MongoServerError') {
      status = 503;
      err.message = 'Database operation failed. Check database availability and input.';
    } else if (err.type === 'entity.parse.failed') {
      status = 400;
      err.message = 'Invalid JSON body';
    } else if (!err.status) {
      status = 500;
      err.message = 'An unexpected error occurred';
    }
    res.status(status).json({ error: { message: err.message } });
  });
  return app;
}
