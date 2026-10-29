import { ArrowRight, Plus, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Metric, Recommendations, Trend, query } from '../components';
import { useData } from '../hooks';
import { useApp } from '../state';
import { number as n } from '../utils';
import { DataState, Heading, TripTable, WorkspaceFilters, mileage } from '../workspace';

export default function Dashboard() {
  const { filters, user } = useApp(),
    summary = useData('/analytics/summary' + query(filters)),
    trend = useData('/analytics/fuel-efficiency' + query(filters)),
    compare = useData('/analytics/vehicle-comparison' + query(filters));
  const s = summary.data;
  return (
    <>
      <Heading
        title="Your fuel, in focus."
        sub="Consumption, cost and the journeys behind them."
        action={
          <Link className="btn primary" to="/app/trips">
            <Plus size={16} />
            Add a trip
          </Link>
        }
      />
      <div className="section-toolbar">
        <span className="section-label">YOUR WORKSPACE SNAPSHOT</span>
        <WorkspaceFilters />
      </div>
      <DataState error={summary.error || trend.error || compare.error} loading={summary.loading} />
      {s && (
        <>
          <div className="metrics">
            <Metric
              label="Distance travelled"
              value={
                <>
                  {n(s.distanceKm, 0)} <small>km</small>
                </>
              }
              sub={`${s.trips} selected trips`}
            />
            <Metric
              label="Fuel consumed"
              value={
                <>
                  {n(s.fuelL)} <small>L</small>
                </>
              }
              sub={`${s.measuredTrips} measured · ${s.estimatedTrips} estimated trips`}
            />
            <Metric
              label="Average efficiency"
              value={mileage(s.mileage, user!.settings.efficiencyUnit)}
              sub="Distance-weighted across all selected trips"
            />
            <Metric
              label="Fuel expenditure"
              value={'₹' + n(s.refuelExpenditure, 0)}
              sub={`${s.refills} recorded fuel purchases`}
            />
          </div>
          <div className="info-strip">
            <Wallet size={17} />
            <span>
              30-day expenditure projection: <b>₹{n(s.estimatedMonthlyExpenditure, 0)}</b> · Based
              on {n(s.observedDays, 0)} observed calendar days. Trip-implied fuel cost:{' '}
              <b>₹{n(s.tripFuelCost, 0)}</b>. Purchases and trip consumption are separate.
            </span>
          </div>
          <div className="grid-two chart-row">
            <Card title="Efficiency over time" sub="Daily weighted mileage · km/L">
              <Trend data={trend.data?.daily || []} />
            </Card>
            <Card title="Vehicle comparison" sub="Distance-weighted mileage · km/L">
              <Trend data={compare.data?.filter((v: any) => v.trips > 0) || []} bars />
            </Card>
          </div>
          <div className="grid-two">
            <Card title="Insights worth a look" sub="Conditional recommendations from your records">
              <Recommendations items={s.recommendations} show={user!.settings.notifications} />
            </Card>
            <section className="forecast-card">
              <div className="eyebrow">PLAN YOUR NEXT JOURNEY</div>
              <Sparkles size={44} />
              <h2>
                Know before
                <br />
                you go.
              </h2>
              <p>Estimate efficiency and fuel needs with a transparent, experimental ML model.</p>
              <Link className="btn primary" to="/app/predict">
                Predict a journey
                <ArrowRight size={17} />
              </Link>
              <small>REVIEW THE MODEL’S LIMITATIONS BEFORE USE</small>
            </section>
          </div>
          <Card
            title="Recent trips"
            sub="Latest journeys in the selected period"
            action={
              <Link className="text-link" to="/app/trips">
                View all trips →
              </Link>
            }
          >
            <TripTable rows={s.recentTrips} />
          </Card>
        </>
      )}
    </>
  );
}
