import { Download } from 'lucide-react';
import { Card, Empty, Export, Metric, query } from '../components';
import { useData } from '../hooks';
import { useApp } from '../state';
import { number as n } from '../utils';
import { DataState, Heading, WorkspaceFilters } from '../workspace';

export default function Reports() {
  const { filters, user } = useApp(),
    summary = useData('/analytics/summary' + query(filters)),
    monthly = useData('/reports/monthly' + query(filters)),
    vehicles = useData('/analytics/vehicle-comparison' + query(filters)),
    predictions = useData('/predictions/history' + query(filters, { limit: 100 }));
  return (
    <>
      <Heading
        title="Your records, ready to share."
        sub="Filtered summaries, CSV export and a print-friendly report."
        action={
          <div className="actions">
            <Export filters={filters} />
            <button className="btn primary no-print" onClick={() => window.print()}>
              <Download size={15} />
              Print / save PDF
            </button>
          </div>
        }
      />
      <WorkspaceFilters />
      <div className="print-heading">
        <h1>IFCA Fuel Analytics Report</h1>
        <p>
          {user?.name} · Generated {new Date().toLocaleDateString('en-IN')} ·{' '}
          {filters.from || 'All dates'} to {filters.to || 'latest'} ·{' '}
          {filters.vehicle ? 'Selected vehicle' : 'All vehicles'}
        </p>
      </div>
      <DataState
        error={summary.error || monthly.error || vehicles.error || predictions.error}
        loading={summary.loading}
      />
      {summary.data && (
        <div className="metrics">
          <Metric label="Distance" value={n(summary.data.distanceKm, 0) + ' km'} />
          <Metric
            label="Consumption"
            value={n(summary.data.fuelL) + ' L'}
            sub={`${summary.data.estimatedTrips} estimated trips`}
          />
          <Metric label="Efficiency" value={n(summary.data.mileage) + ' km/L'} />
          <Metric label="Purchases" value={'₹' + n(summary.data.refuelExpenditure, 0)} />
        </div>
      )}
      <Card
        title="Monthly expenditure"
        sub="Refuelling purchases and trip-implied costs represent different measures."
      >
        {monthly.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Distance</th>
                  <th>Fuel</th>
                  <th>Efficiency</th>
                  <th>Purchases</th>
                  <th>Trip-implied cost</th>
                </tr>
              </thead>
              <tbody>
                {monthly.data.map((r: any) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{n(r.distanceKm)} km</td>
                    <td>{n(r.fuelL)} L</td>
                    <td>{n(r.mileage)} km/L</td>
                    <td>₹{n(r.refuelExpenditure, 2)}</td>
                    <td>₹{n(r.tripFuelCost, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Card>
      <Card title="Vehicle performance" sub="Comparison across selected records.">
        {vehicles.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Trips</th>
                  <th>Distance</th>
                  <th>Efficiency</th>
                  <th>Estimated trips</th>
                  <th>Purchases</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.data.map((v: any) => (
                  <tr key={v.id}>
                    <td>{v.label}</td>
                    <td>{v.trips}</td>
                    <td>{n(v.distanceKm)} km</td>
                    <td>{n(v.mileage)} km/L</td>
                    <td>{v.estimatedTrips}</td>
                    <td>₹{n(v.refuelExpenditure, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Card>
      <Card
        title="Prediction report"
        sub={`Latest 100 filtered predictions. ${predictions.data?.total || 0} total match. Predictions may be experimental.`}
      >
        {predictions.data?.items?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle / date</th>
                  <th>Predicted km/L</th>
                  <th>Actual km/L</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {predictions.data.items.map((p: any) => (
                  <tr key={p._id}>
                    <td>
                      {p.vehicle.name}
                      <small>{new Date(p.createdAt).toLocaleDateString('en-IN')}</small>
                    </td>
                    <td>{n(p.result.mileage)}</td>
                    <td>{n(p.actualMileage)}</td>
                    <td>{p.result.dataset_source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No prediction records in this period." />
        )}
      </Card>
      <p className="small-note">
        Trip CSV export includes every matching trip up to the documented 10,000-record analytical
        limit. Reports use only your authenticated records and the selected date/vehicle filters.
        Print excludes navigation and controls. Browser “Save as PDF” creates the PDF; the app does
        not generate a separate PDF file.
      </p>
    </>
  );
}
