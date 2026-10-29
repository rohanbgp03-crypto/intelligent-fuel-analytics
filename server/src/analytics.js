export const total = (rows, f) =>
  rows.reduce((s, x) => s + Number(typeof f === 'function' ? f(x) : x[f] || 0), 0);
export function calculate(distance, fuel, price) {
  if (![distance, fuel, price].every(Number.isFinite) || distance <= 0 || fuel <= 0 || price <= 0)
    throw new Error('Distance, fuel and price must be positive finite numbers');
  return {
    mileage: distance / fuel,
    litresPer100Km: (fuel / distance) * 100,
    cost: fuel * price,
    costPerKm: (fuel * price) / distance,
  };
}
export function summary(trips, logs) {
  let distance = total(trips, 'distanceKm'),
    fuel = total(trips, 'fuelL'),
    refuelCost = total(logs, (x) => x.litres * x.pricePerL),
    days = [...trips, ...logs].map((x) => Date.parse(x.date)),
    span = days.length ? Math.max(1, (Math.max(...days) - Math.min(...days)) / 86400000 + 1) : 0;
  return {
    trips: trips.length,
    distanceKm: distance,
    fuelL: fuel,
    mileage: fuel ? distance / fuel : null,
    litresPer100Km: distance ? (fuel / distance) * 100 : null,
    tripFuelCost: total(trips, (x) => x.fuelL * x.pricePerL),
    refuelExpenditure: refuelCost,
    estimatedMonthlyExpenditure: span ? (refuelCost / span) * 30 : null,
    observedDays: span,
    estimatedTrips: trips.filter((x) => x.fuelSource === 'estimated').length,
    measuredTrips: trips.filter((x) => x.fuelSource === 'measured').length,
    refills: logs.length,
  };
}
export function grouped(trips, logs, key) {
  const groups = new Map();
  for (const x of trips) {
    let k = key(x);
    if (!groups.has(k)) groups.set(k, { trips: [], logs: [] });
    groups.get(k).trips.push(x);
  }
  for (const x of logs) {
    let k = key(x);
    if (!groups.has(k)) groups.set(k, { trips: [], logs: [] });
    groups.get(k).logs.push(x);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, x]) => ({ label, ...summary(x.trips, x.logs) }));
}
export function week(date) {
  let d = new Date(date + 'T00:00:00Z'),
    day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function tankIntervals(logs) {
  let result = [];
  const groups = new Map();
  for (const l of logs) {
    let k = String(l.vehicle?._id || l.vehicle);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  for (const [vehicle, ls] of groups) {
    ls.sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer);
    let anchor = null,
      litres = 0,
      cost = 0;
    for (const l of ls) {
      if (!anchor) {
        if (l.fullTank) anchor = l;
        continue;
      }
      litres += l.litres;
      cost += l.litres * l.pricePerL;
      if (l.fullTank) {
        let distance = l.odometer - anchor.odometer;
        if (distance > 0 && litres > 0)
          result.push({
            vehicle,
            from: anchor.date,
            to: l.date,
            distanceKm: distance,
            fuelL: litres,
            mileage: distance / litres,
            cost,
          });
        anchor = l;
        litres = 0;
        cost = 0;
      }
    }
  }
  return result;
}
export function recommendations(trips, vehicles) {
  let out = [];
  const now = new Date().toISOString();
  const add = (title, explanation, evidence, action, severity = 'info') =>
    out.push({ title, explanation, evidence, action, severity, generatedAt: now });
  for (const v of vehicles) {
    const rows = trips
        .filter((t) => String(t.vehicle?._id || t.vehicle) === String(v._id))
        .sort((a, b) => a.date.localeCompare(b.date)),
      measured = rows.filter((t) => t.fuelSource === 'measured');
    let idle = rows.filter((t) => t.idleMinutes !== undefined);
    if (idle.length >= 3) {
      let avg = total(idle, 'idleMinutes') / idle.length;
      if (avg >= 10)
        add(
          'Review idling: ' + v.name,
          'Recorded idling may offer an opportunity to reduce consumption.',
          `${avg.toFixed(1)} minutes average across ${idle.length} trips`,
          'Reduce unnecessary idling where safe, then compare similar journeys.',
          'warning',
        );
    }
    if (measured.length >= 6) {
      let old = measured.slice(0, -3),
        recent = measured.slice(-3),
        baseline = total(old, 'distanceKm') / total(old, 'fuelL'),
        current = total(recent, 'distanceKm') / total(recent, 'fuelL');
      if (current < baseline * 0.8)
        add(
          'Mileage decline: ' + v.name,
          'Recent measured efficiency is below this vehicle’s earlier baseline; the cause is not established.',
          `${current.toFixed(1)} km/L over latest 3 trips vs ${baseline.toFixed(1)} km/L over ${old.length} earlier trips`,
          'Check measurement accuracy and compare route, load and traffic; consider tyre pressure and scheduled maintenance.',
          'warning',
        );
    }
    if (measured.length >= 4) {
      let latest = measured.at(-1),
        previous = measured.slice(0, -1),
        base = total(previous, 'distanceKm') / total(previous, 'fuelL'),
        actual = latest.distanceKm / latest.fuelL;
      if (actual < base * 0.75)
        add(
          'Unusual consumption: ' + v.name,
          'The latest measured trip used more fuel per kilometre than its historical baseline.',
          `${actual.toFixed(1)} km/L on ${latest.date}; baseline ${base.toFixed(1)} km/L across ${previous.length} earlier trips`,
          'Review the trip record and conditions. This does not establish a mechanical fault or theft.',
          'alert',
        );
    }
  }
  if (!out.length)
    add(
      'Build a reliable baseline',
      'No rule thresholds were met, or the selected data is insufficient.',
      `${trips.length} selected trips`,
      'Record measured fuel and consistent trip conditions; at least 4–6 measured trips per vehicle improve comparisons.',
    );
  return out;
}
export function csv(rows, headers) {
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    '\uFEFF' +
    [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\r\n')
  );
}
