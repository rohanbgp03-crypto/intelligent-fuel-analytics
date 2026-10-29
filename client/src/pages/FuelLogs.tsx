import { Fuel, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, json } from '../api';
import { Card, Empty, Message, ModalForm, Pagination, query, type Field } from '../components';
import { useData } from '../hooks';
import { useApp } from '../state';
import { number as n, today } from '../utils';
import { DataState, Heading, WorkspaceFilters } from '../workspace';

export default function FuelLogs() {
  const { vehicles, filters } = useApp(),
    [revision, bump] = useState(0),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<any>(undefined),
    [error, setError] = useState(''),
    result = useData('/fuel-logs' + query(filters, { page }), revision),
    eff = useData('/analytics/fuel-efficiency' + query(filters), revision);
  useEffect(() => setPage(1), [JSON.stringify(filters)]);
  const fields: Field[] = [
    {
      name: 'vehicle',
      label: 'Vehicle',
      required: true,
      options: vehicles.map((v) => ({ value: v._id, label: v.name })),
    },
    { name: 'date', label: 'Refuelling date', type: 'date', required: true, default: today() },
    { name: 'litres', label: 'Quantity (L)', type: 'number', min: 0.01, max: 3000, required: true },
    {
      name: 'pricePerL',
      label: 'Price per litre (₹)',
      type: 'number',
      min: 0.01,
      max: 2000,
      required: true,
      default: 105,
    },
    {
      name: 'odometer',
      label: 'Odometer (km)',
      type: 'number',
      min: 0,
      max: 10000000,
      required: true,
    },
    {
      name: 'fullTank',
      label: 'Tank filled completely',
      type: 'checkbox',
      hint: 'Leave unchecked for a partial refill.',
    },
    { name: 'station', label: 'Fuel station' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];
  return (
    <>
      <Heading
        title="Keep every refill in view."
        sub="Purchases are not the same as fuel consumed on an individual trip."
        action={
          <button
            className="btn primary"
            disabled={!vehicles.length}
            onClick={() => setEditing(null)}
          >
            <Plus size={16} />
            Add refill
          </button>
        }
      />
      <WorkspaceFilters />
      <div className="info-strip">
        <Fuel size={19} />
        <span>
          <b>Full tank to full tank:</b> fuel is the sum of all refills after an opening full tank,
          including the closing full refill. Partial refills are accumulated. Opening refill litres
          are excluded. Intervals need both full-tank anchors inside the active filter.
        </span>
      </div>
      <Card
        title="Refuelling records"
        sub="Total amount is calculated from litres × price per litre."
      >
        <Message text={error} error />
        <DataState error={result.error} loading={result.loading} />
        {result.data &&
          (result.data.items.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date / vehicle</th>
                      <th>Quantity</th>
                      <th>Price / L</th>
                      <th>Total paid</th>
                      <th>Odometer</th>
                      <th>Tank / station</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((r: any) => (
                      <tr key={r._id}>
                        <td>
                          <b>{r.vehicle.name}</b>
                          <small>{r.date}</small>
                        </td>
                        <td>{n(r.litres, 2)} L</td>
                        <td>₹{n(r.pricePerL, 2)}</td>
                        <td>₹{n(r.totalCost, 2)}</td>
                        <td>{n(r.odometer, 0)} km</td>
                        <td>
                          <span className={'pill ' + (!r.fullTank ? 'amber' : '')}>
                            {r.fullTank ? 'Full tank' : 'Partial'}
                          </span>
                          <small>{r.station || '—'}</small>
                          <small>{r.notes}</small>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="icon-button"
                              aria-label={'Edit refill ' + r.date}
                              onClick={() => setEditing(r)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button danger"
                              aria-label={'Delete refill ' + r.date}
                              onClick={async () => {
                                if (
                                  !confirm(
                                    'Delete this refill? Tank intervals will be recalculated.',
                                  )
                                )
                                  return;
                                try {
                                  await api('/fuel-logs/' + r._id, json('DELETE'));
                                  bump((x) => x + 1);
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={result.data.total} onPage={setPage} />
            </>
          ) : (
            <Empty />
          ))}
      </Card>
      <Card
        title="Completed tank intervals"
        sub="Calculated only when both full-tank anchors and valid odometer differences exist."
      >
        <Message text={eff.error} error />
        {eff.data?.tankIntervals?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Period</th>
                  <th>Distance</th>
                  <th>Fuel consumed</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {eff.data.tankIntervals.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>{vehicles.find((v) => v._id === r.vehicle)?.name || r.vehicle}</td>
                    <td>
                      {r.from} → {r.to}
                    </td>
                    <td>{n(r.distanceKm)} km</td>
                    <td>{n(r.fuelL, 2)} L</td>
                    <td>{n(r.mileage)} km/L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No complete full-tank intervals in this selection." />
        )}
      </Card>
      {editing !== undefined && (
        <ModalForm
          title={editing ? 'Edit refill' : 'Add refill'}
          fields={fields}
          initial={editing || {}}
          onClose={() => setEditing(undefined)}
          onSave={async (d) => {
            await api(
              '/fuel-logs' + (editing ? '/' + editing._id : ''),
              json(editing ? 'PUT' : 'POST', d),
            );
            bump((x) => x + 1);
          }}
        />
      )}
    </>
  );
}
