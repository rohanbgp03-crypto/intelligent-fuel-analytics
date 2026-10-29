import { useState } from 'react';
import { Card, Empty, Recommendations, Trend, query } from '../components';
import { useData } from '../hooks';
import { useApp } from '../state';
import { number as n } from '../utils';
import { DataState, Heading, WorkspaceFilters } from '../workspace';

export default function Analytics() {
  const { filters, user } = useApp(),
    [period, setPeriod] = useState('daily'),
    eff = useData('/analytics/fuel-efficiency' + query(filters)),
    costs = useData('/analytics/fuel-costs' + query(filters)),
    compare = useData('/analytics/vehicle-comparison' + query(filters)),
    rec = useData('/recommendations' + query(filters));
  const distribution = (eff.data?.distribution || []).reduce(
    (b: any[], t: any) => {
      const index = Math.min(4, Math.floor(t.mileage / 10));
      b[index].trips++;
      return b;
    },
    [
      { label: '0–10 km/L', trips: 0 },
      { label: '10–20 km/L', trips: 0 },
      { label: '20–30 km/L', trips: 0 },
      { label: '30–40 km/L', trips: 0 },
      { label: '40+ km/L', trips: 0 },
    ],
  );
  return (
    <>
      <Heading
        title="Patterns with perspective."
        sub="Explore correlations in your records without assuming their cause."
      />
      <div className="section-toolbar">
        <WorkspaceFilters />
        <select
          aria-label="Analytics grouping"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <DataState
        error={eff.error || costs.error || compare.error || rec.error}
        loading={eff.loading}
      />
      <div className="grid-two">
        <Card title="Fuel efficiency" sub="Distance-weighted mileage; includes labelled estimates">
          <Trend data={eff.data?.[period] || []} />
        </Card>
        <Card title="Fuel consumption" sub="Litres per 100 km; lower means more efficient">
          <Trend data={eff.data?.[period] || []} series={[['litresPer100Km', 'L/100 km']]} />
        </Card>
        <Card
          title="Fuel expenditure"
          sub="Purchases vs trip-implied cost; do not add these together"
        >
          <Trend
            data={costs.data || []}
            series={[
              ['refuelExpenditure', 'Purchases (₹)'],
              ['tripFuelCost', 'Trip-implied cost (₹)'],
            ]}
          />
        </Card>
        <Card title="Vehicle comparison" sub="Weighted efficiency across selected records">
          <Trend data={compare.data?.filter((v: any) => v.trips) || []} bars />
        </Card>
        <Card title="Efficiency distribution" sub="Number of trips per mileage range">
          <Trend
            data={eff.data?.distribution?.length ? distribution : []}
            series={[['trips', 'Trips']]}
            bars
          />
        </Card>
        <Card title="Recommendations & alerts" sub="Supporting data and conditional actions">
          <Recommendations items={rec.data || []} show={user!.settings.notifications} />
        </Card>
      </div>
      <Card
        title="Driving-condition comparisons"
        sub="At least three trips per condition. Comparisons are descriptive and may reflect different vehicles, routes or loads."
      >
        {eff.data?.conditions?.some((c: any) => c.groups.length) ? (
          <div className="grid-three">
            {eff.data.conditions.map((c: any) => (
              <div key={c.field}>
                <h3>{c.field}</h3>
                {c.groups.length ? (
                  c.groups.map((g: any) => (
                    <div className="condition-row" key={g.label}>
                      <b>{g.label}</b>
                      <span>
                        {n(g.mileage)} km/L · {g.trips} trips
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted">Not enough data.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Record at least three trips with the same traffic, road or weather condition to compare." />
        )}
      </Card>
    </>
  );
}
