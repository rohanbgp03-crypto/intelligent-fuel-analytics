import { ArrowRight, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, json } from '../api';
import { Card, Empty, Message, Metric, Pagination, PredictionPlot, query } from '../components';
import { useData } from '../hooks';
import { useApp } from '../state';
import { number as n } from '../utils';
import { DataState, Heading, WorkspaceFilters } from '../workspace';

export default function Predict() {
  const formRef = useRef<HTMLFormElement>(null);
  const { vehicles, filters } = useApp(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [revision, bump] = useState(0),
    [page, setPage] = useState(1),
    [vehicle, setVehicle] = useState(''),
    [trip, setTrip] = useState(''),
    meta = useData('/predictions/model'),
    history = useData('/predictions/history' + query(filters, { page }), revision),
    tripOptions = useData('/trips' + query(vehicle ? { vehicle } : {}, { limit: 100 }));
  useEffect(() => setPage(1), [JSON.stringify(filters)]);
  return (
    <>
      <Heading
        title="A little foresight."
        sub="Experimental fuel efficiency predictions from a Python Random Forest model."
      />
      <Message text="The included model is trained on labelled synthetic development data. Its predictions and scores are experimental, not verified real-world vehicle performance." />
      <div className="prediction-grid">
        <Card title="Plan a journey" sub="Vehicle engine capacity and weight are required.">
          <form
            ref={formRef}
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setBusy(true);
              const d: any = Object.fromEntries(new FormData(e.currentTarget));
              const price = +d.price;
              delete d.price;
              if (!d.tripId) delete d.tripId;
              for (const k of ['distanceKm', 'avgSpeed', 'idleMinutes']) d[k] = +d[k];
              try {
                const r = await api('/predictions/fuel-efficiency', json('POST', d));
                setResult({ ...r, price });
                bump((x) => x + 1);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="span-two">
              Vehicle
              <select
                name="vehicle"
                required
                value={vehicle}
                onChange={(e) => {
                  setVehicle(e.target.value);
                  setTrip('');
                }}
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} · {v.engineL || '?'} L / {v.weightKg || '?'} kg
                  </option>
                ))}
              </select>
            </label>
            <label className="span-two">
              Optional observation to compare
              <select
                name="tripId"
                value={trip}
                onChange={(e) => {
                  setTrip(e.target.value);
                  const t = tripOptions.data?.items.find((t: any) => t._id === e.target.value);
                  if (t && formRef.current) {
                    for (const key of [
                      'distanceKm',
                      'avgSpeed',
                      'idleMinutes',
                      'traffic',
                      'road',
                    ]) {
                      const el = formRef.current.elements.namedItem(key) as
                        HTMLInputElement | HTMLSelectElement | null;
                      if (el && t[key] !== undefined) el.value = String(t[key]);
                    }
                  }
                }}
              >
                <option value="">No actual trip linked</option>
                {tripOptions.data?.items?.map((t: any) => (
                  <option value={t._id} key={t._id}>
                    {t.date} · {t.distanceKm} km · {t.fuelSource}
                  </option>
                ))}
              </select>
              <small>
                Latest 100 trips for this vehicle. Input conditions below must describe the chosen
                trip; only measured fuel is used as an actual observation.
              </small>
            </label>
            <label>
              Distance (km)
              <input
                type="number"
                name="distanceKm"
                min=".1"
                max="10000"
                step="any"
                defaultValue="120"
                required
              />
            </label>
            <label>
              Average speed (km/h)
              <input
                type="number"
                name="avgSpeed"
                min="1"
                max="160"
                step="any"
                defaultValue="60"
                required
              />
            </label>
            <label>
              Idle time (min)
              <input
                type="number"
                name="idleMinutes"
                min="0"
                max="240"
                step="any"
                defaultValue="10"
                required
              />
            </label>
            <label>
              Fuel price (₹/L)
              <input
                type="number"
                name="price"
                min=".01"
                max="2000"
                step="any"
                defaultValue="105"
                required
              />
            </label>
            <label>
              Traffic
              <select name="traffic">
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </label>
            <label>
              Road
              <select name="road">
                <option value="mixed">Mixed</option>
                <option value="city">City</option>
                <option value="highway">Highway</option>
              </select>
            </label>
            <div className="span-two">
              <Message text={error} error />
            </div>
            <button className="btn primary full" disabled={busy || !vehicles.length}>
              {busy ? 'Predicting…' : 'Estimate efficiency'}
              <ArrowRight size={17} />
            </button>
          </form>
        </Card>
        <div className="prediction-output">
          {result ? (
            <>
              <div className="eyebrow">PREDICTED FUEL EFFICIENCY</div>
              <div className="big-result">
                {n(result.result.mileage)}
                <small>km/L</small>
              </div>
              <div className="result-facts">
                <div>
                  <b>{n(result.result.fuelRequiredL, 2)} L</b>
                  <span>Fuel required</span>
                </div>
                <div>
                  <b>₹{n(result.result.fuelRequiredL * result.price, 0)}</b>
                  <span>Estimated trip cost</span>
                </div>
              </div>
              <p>{n(result.result.litresPer100Km)} L/100 km</p>
              {result.actualMileage && (
                <p className="actual">
                  Actual measured: <b>{n(result.actualMileage)} km/L</b>
                  <br />
                  Difference: {n(result.result.mileage - result.actualMileage)} km/L
                </p>
              )}
              {result.result.warnings.map((w: string) => (
                <Message text={w} key={w} />
              ))}
              <small>
                Held-out model MAE: {n(result.result.testMetrics.mae, 2)} km/L. This is a
                dataset-level metric, not a confidence interval.
              </small>
            </>
          ) : (
            <>
              <Sparkles size={42} />
              <h2>
                See the journey
                <br />
                before it starts.
              </h2>
              <p>
                Submit your expected conditions for an experimental estimate. Missing services
                return a clear error rather than a made-up result.
              </p>
            </>
          )}
        </div>
      </div>
      <DataState error={meta.error} loading={meta.loading} />
      {meta.data && (
        <Card title="Inside the model" sub={`${meta.data.model} · ${meta.data.dataset_source}`}>
          <div className="metrics three">
            <Metric
              label="MAE"
              value={n(meta.data.metrics.mae, 3) + ' km/L'}
              sub={'Baseline: ' + n(meta.data.baseline_metrics.mae, 3) + ' km/L'}
            />
            <Metric
              label="RMSE"
              value={n(meta.data.metrics.rmse, 3) + ' km/L'}
              sub={'Baseline: ' + n(meta.data.baseline_metrics.rmse, 3) + ' km/L'}
            />
            <Metric
              label="R²"
              value={n(meta.data.metrics.r2, 4)}
              sub="Measured on held-out vehicles"
            />
          </div>
          <div className="grid-two">
            <div>
              <h3>Evaluation protocol</h3>
              <p>{meta.data.split}</p>
              <p>
                {meta.data.train_rows} training rows / {meta.data.train_vehicles} vehicles.{' '}
                {meta.data.test_rows} test rows / {meta.data.test_vehicles} vehicles. Vehicle
                overlap: {String(meta.data.group_overlap)}.
              </p>
              <p className="small-note">
                Preprocessing is fitted inside the training pipeline. The saved model is the
                evaluated training model; the test partition is not refitted. No model accuracy is
                fabricated.
              </p>
              {meta.data.limitations.map((l: string) => (
                <p className="small-note" key={l}>
                  • {l}
                </p>
              ))}
            </div>
            <PredictionPlot data={meta.data.test_examples} />
          </div>
        </Card>
      )}
      <div className="section-toolbar">
        <h2>Prediction history</h2>
        <WorkspaceFilters />
      </div>
      <Card
        title="Your saved estimates"
        sub="Actual observations appear only for linked trips with directly measured fuel."
      >
        <DataState error={history.error} loading={history.loading} />
        {history.data?.items?.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Created / vehicle</th>
                    <th>Predicted</th>
                    <th>Actual measured</th>
                    <th>Difference</th>
                    <th>Dataset</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((p: any) => (
                    <tr key={p._id}>
                      <td>
                        <b>{p.vehicle.name}</b>
                        <small>{new Date(p.createdAt).toLocaleDateString('en-IN')}</small>
                      </td>
                      <td>{n(p.result.mileage)} km/L</td>
                      <td>
                        {p.actualMileage ? n(p.actualMileage) + ' km/L' : 'Not linked / estimated'}
                      </td>
                      <td>
                        {p.actualMileage ? n(p.result.mileage - p.actualMileage) + ' km/L' : '—'}
                      </td>
                      <td>
                        <span className="pill amber">
                          {p.result.experimental ? 'Synthetic / experimental' : 'Custom model'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button danger"
                          aria-label="Delete prediction"
                          onClick={async () => {
                            if (!confirm('Delete this saved prediction?')) return;
                            try {
                              await api('/predictions/' + p._id, json('DELETE'));
                              bump((x) => x + 1);
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={history.data.total} onPage={setPage} />
          </>
        ) : (
          !history.loading && <Empty text="No predictions saved in this period." />
        )}
      </Card>
    </>
  );
}
