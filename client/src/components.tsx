import { AlertTriangle, ArrowDownToLine, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, download } from './api';
import { dateBefore, sanitizeForm, today } from './utils';
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: string;
  default?: unknown;
  hint?: string;
};
export function Message({ text, error = false }: { text: string; error?: boolean }) {
  return text ? (
    <div role={error ? 'alert' : 'status'} className={'message ' + (error ? 'error' : '')}>
      <AlertTriangle size={17} />
      <span>{text}</span>
    </div>
  ) : null;
}
export function Empty({
  text = 'No records yet. Add your first record to get started.',
}: {
  text?: string;
}) {
  return <div className="empty">{text}</div>;
}
export function Card({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
export function Trend({
  data,
  series = [['mileage', 'Efficiency (km/L)']],
  bars = false,
}: {
  data: any[];
  series?: string[][];
  bars?: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!data.length) return <Empty text="No data in the selected period." />;
  if (!ready) return null;
  const colors = ['#0a8577', '#8cba86', '#e7b25b'];
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {bars ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            {series.map(([key, label], i) => (
              <Bar
                key={key}
                dataKey={key}
                name={label}
                fill={colors[i % 3]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            {series.map(([key, label], i) => (
              <Line
                key={key}
                dataKey={key}
                name={label}
                stroke={colors[i % 3]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
export function PredictionPlot({ data }: { data: any[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 5" />
          <XAxis
            type="number"
            dataKey="actual"
            name="Actual"
            unit=" km/L"
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="predicted"
            name="Predicted"
            unit=" km/L"
            tick={{ fontSize: 10 }}
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Test records" data={data} fill="#0a8577" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Filters({
  vehicles,
  value,
  onChange,
}: {
  vehicles: any[];
  value: Record<string, string>;
  onChange: (x: Record<string, string>) => void;
}) {
  const [period, setPeriod] = useState('all');
  return (
    <div className="filters no-print">
      <label>
        Vehicle
        <select
          value={value.vehicle || ''}
          onChange={(e) => onChange({ ...value, vehicle: e.target.value })}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Period
        <select
          value={period}
          onChange={(e) => {
            const p = e.target.value;
            setPeriod(p);
            onChange({
              ...value,
              from: p === 'all' ? '' : p === 'custom' ? value.from || '' : dateBefore(+p),
              to: p === 'all' ? '' : p === 'custom' ? value.to || '' : today(),
            });
          }}
        >
          <option value="all">All dates</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      {period === 'custom' && (
        <>
          <label>
            From
            <input
              type="date"
              value={value.from || ''}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={value.to || ''}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
export const query = (f: Record<string, string>, extra: Record<string, string | number> = {}) =>
  '?' +
  new URLSearchParams(
    Object.fromEntries(
      Object.entries({ ...f, ...extra })
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
export function ModalForm({
  title,
  fields,
  initial = {},
  onClose,
  onSave,
}: {
  title: string;
  fields: Field[];
  initial?: any;
  onClose: () => void;
  onSave: (d: any) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="dialog-head">
        <div>
          <div className="eyebrow">WORKSPACE RECORD</div>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={22} />
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const d = Object.fromEntries(new FormData(e.currentTarget));
          const converted: Record<string, unknown> = {};
          for (const f of fields) {
            const v = d[f.name];
            converted[f.name] =
              f.type === 'checkbox' ? v === 'on' : f.type === 'number' && v !== '' ? Number(v) : v;
          }
          try {
            await onSave(sanitizeForm(converted));
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {fields.map((f) => (
            <label className={f.type === 'textarea' ? 'span-two' : ''} key={f.name}>
              {f.label}
              {f.required ? ' *' : ''}
              {f.options ? (
                <select
                  name={f.name}
                  defaultValue={initial[f.name]?._id || initial[f.name] || f.default || ''}
                  required={f.required}
                >
                  {!f.required && <option value="">Not recorded</option>}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea name={f.name} defaultValue={initial[f.name] || ''} maxLength={500} />
              ) : f.type === 'checkbox' ? (
                <input
                  className="checkbox"
                  type="checkbox"
                  name={f.name}
                  defaultChecked={initial[f.name] ?? f.default ?? false}
                />
              ) : (
                <input
                  name={f.name}
                  type={f.type || 'text'}
                  defaultValue={initial[f.name] ?? f.default ?? ''}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  step={f.step || (f.type === 'number' ? 'any' : undefined)}
                  maxLength={f.type === 'text' ? 100 : undefined}
                />
              )}{' '}
              {f.hint && <small>{f.hint}</small>}
            </label>
          ))}
        </div>
        <Message text={error} error />
        <button className="btn primary full" disabled={busy}>
          {busy ? 'Saving…' : 'Save record'}
        </button>
      </form>
    </dialog>
  );
}
export function Pagination({
  page,
  total,
  onPage,
  limit = 15,
}: {
  page: number;
  total: number;
  limit?: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} records`
          : '0 records'}
      </span>
      <div>
        <button className="btn small" onClick={() => onPage(page - 1)} disabled={page === 1}>
          <ChevronLeft size={14} />
          Previous
        </button>
        <button
          className="btn small"
          onClick={() => onPage(page + 1)}
          disabled={page * limit >= total}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
export function Export({ filters }: { filters: Record<string, string> }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <>
      <button
        className="btn small no-print"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            download(
              await api<string>('/reports/export' + query(filters)),
              'IFCA_Filtered_Trips.csv',
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <ArrowDownToLine size={14} />
        {busy ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && (
        <span role="alert" className="error-text">
          {error}
        </span>
      )}
    </>
  );
}
export function Recommendations({ items, show = true }: { items: any[]; show?: boolean }) {
  if (!show)
    return <p className="muted">Recommendations are hidden by your notification preference.</p>;
  return (
    <div>
      {items.map((r, i) => (
        <div className={'recommendation ' + r.severity} key={i}>
          <div className="rec-icon">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3>{r.title}</h3>
            <p>{r.explanation}</p>
            <b>{r.evidence}</b>
            <p>{r.action}</p>
            <small>
              {new Date(r.generatedAt).toLocaleDateString('en-IN')} · {r.severity}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}
export function SearchInput({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <div className="search">
      <Search size={16} />
      <input
        aria-label="Search trips"
        placeholder="Search vehicle, date or notes…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
