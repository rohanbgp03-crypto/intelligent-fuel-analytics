import { Fuel, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Filters, Message } from './components';
import { useApp } from './state';
import { number as n } from './utils';

export function DataState({ error, loading }: { error: string; loading: boolean }) {
  return error ? (
    <Message text={error} error />
  ) : loading ? (
    <div className="loading" role="status">
      Loading your workspace…
    </div>
  ) : null;
}

export function mileage(value: number | null | undefined, unit: string) {
  return unit === 'L/100km' ? n(value ? 100 / value : null) + ' L/100 km' : n(value) + ' km/L';
}

export function Logo() {
  return (
    <Link className="logo" to="/">
      <span>
        <Fuel size={22} />
      </span>
      IFCA<span className="logo-dot">.</span>
    </Link>
  );
}

export function Heading({
  eyebrow = 'EVERY LITRE TELLS A STORY',
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}

export function WorkspaceFilters() {
  const { vehicles, filters, setFilters } = useApp();
  return <Filters vehicles={vehicles} value={filters} onChange={setFilters} />;
}

export function TripTable({ rows, actions }: { rows: any[]; actions?: (r: any) => ReactNode }) {
  const { user } = useApp();
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date / vehicle</th>
            <th>Distance</th>
            <th>Fuel</th>
            <th>Efficiency</th>
            <th>Trip fuel cost</th>
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td>
                <b>{r.vehicle?.name || 'Vehicle'}</b>
                <small>{r.date}</small>
              </td>
              <td>{n(r.distanceKm)} km</td>
              <td>
                {n(r.fuelL, 2)} L{' '}
                <span className={'pill ' + (r.fuelSource === 'estimated' ? 'amber' : '')}>
                  {r.fuelSource}
                </span>
              </td>
              <td>{mileage(r.distanceKm / r.fuelL, user!.settings.efficiencyUnit)}</td>
              <td>₹{n(r.fuelL * r.pricePerL, 0)}</td>
              {actions && <td>{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty />
  );
}

export function Detail({
  title,
  values,
  onClose,
}: {
  title: string;
  values: Record<string, unknown>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close details" onClick={onClose}>
          <X />
        </button>
      </div>
      <dl className="detail-list">
        {Object.entries(values).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v === undefined || v === '' ? 'Not recorded' : String(v)}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  );
}
