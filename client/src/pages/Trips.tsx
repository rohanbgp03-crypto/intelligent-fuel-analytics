import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, json } from '../api';
import {
  Card,
  Export,
  Message,
  ModalForm,
  Pagination,
  SearchInput,
  query,
  type Field,
} from '../components';
import { useData } from '../hooks';
import { useApp } from '../state';
import { today } from '../utils';
import { DataState, Detail, Heading, TripTable, WorkspaceFilters } from '../workspace';

function tripFields(vehicles: any[]): Field[] {
  return [
    {
      name: 'vehicle',
      label: 'Vehicle',
      required: true,
      options: vehicles.map((v) => ({ value: v._id, label: v.name })),
    },
    { name: 'date', label: 'Trip date', type: 'date', required: true, default: today() },
    {
      name: 'distanceKm',
      label: 'Distance (km)',
      type: 'number',
      min: 0.1,
      max: 10000,
      required: true,
    },
    {
      name: 'fuelL',
      label: 'Fuel consumed (L)',
      type: 'number',
      min: 0.01,
      max: 3000,
      required: true,
    },
    {
      name: 'fuelSource',
      label: 'Fuel measurement',
      required: true,
      options: [
        { value: 'measured', label: 'Directly measured' },
        { value: 'estimated', label: 'Estimated' },
      ],
      default: 'measured',
    },
    {
      name: 'pricePerL',
      label: 'Fuel price (₹/L)',
      type: 'number',
      min: 0.01,
      max: 2000,
      required: true,
      default: 105,
    },
    {
      name: 'startOdometer',
      label: 'Starting odometer (km)',
      type: 'number',
      min: 0,
      max: 10000000,
    },
    {
      name: 'endOdometer',
      label: 'Ending odometer (km)',
      type: 'number',
      min: 0,
      max: 10000000,
      hint: 'Supply both readings; difference must match distance.',
    },
    {
      name: 'durationMinutes',
      label: 'Duration (min, including idling)',
      type: 'number',
      min: 0.1,
      max: 10000,
    },
    { name: 'avgSpeed', label: 'Average speed (km/h)', type: 'number', min: 1, max: 200 },
    { name: 'idleMinutes', label: 'Idle time (min)', type: 'number', min: 0, max: 2000 },
    {
      name: 'traffic',
      label: 'Traffic',
      options: ['light', 'moderate', 'heavy'].map((x) => ({ value: x, label: x })),
    },
    {
      name: 'road',
      label: 'Road type',
      options: ['city', 'highway', 'mixed'].map((x) => ({ value: x, label: x })),
    },
    {
      name: 'weather',
      label: 'Weather',
      options: ['clear', 'rain', 'cold', 'hot'].map((x) => ({ value: x, label: x })),
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];
}
export default function Trips() {
  const { vehicles, filters } = useApp(),
    [revision, bump] = useState(0),
    [editing, setEditing] = useState<any>(undefined),
    [detail, setDetail] = useState<any>(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState('date'),
    [order, setOrder] = useState('desc'),
    [error, setError] = useState('');
  const result = useData('/trips' + query(filters, { page, q: search, sort, order }), revision);
  useEffect(() => setPage(1), [JSON.stringify(filters), search, sort, order]);
  return (
    <>
      <Heading
        title="Every journey counts."
        sub="Record measured or estimated consumption, with the distinction always visible."
        action={
          <button
            disabled={!vehicles.length}
            className="btn primary"
            onClick={() => setEditing(null)}
          >
            <Plus size={16} />
            Add trip
          </button>
        }
      />
      {!vehicles.length && <Message text="Add a vehicle before recording trips." />}
      <div className="section-toolbar">
        <WorkspaceFilters />
        <Export filters={filters} />
      </div>
      <Card title="Trip records" sub="Fuel purchases are tracked separately in the fuel log.">
        <div className="list-toolbar">
          <SearchInput value={search} onChange={setSearch} />
          <label>
            Sort
            <select aria-label="Sort trips" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Date</option>
              <option value="distance">Distance</option>
              <option value="cost">Cost</option>
              <option value="efficiency">Efficiency</option>
            </select>
          </label>
          <select
            aria-label="Sort direction"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        <Message text={error} error />
        <DataState error={result.error} loading={result.loading} />
        {result.data && (
          <>
            <TripTable
              rows={result.data.items}
              actions={(r) => (
                <div className="table-actions">
                  <button className="text-link" onClick={() => setDetail(r)}>
                    Details
                  </button>
                  <button
                    className="icon-button"
                    aria-label={'Edit trip ' + r.date}
                    onClick={() => setEditing(r)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={'Delete trip ' + r.date}
                    onClick={async () => {
                      if (
                        !confirm(
                          'Delete this trip? Linked prediction observations will be unlinked.',
                        )
                      )
                        return;
                      try {
                        await api('/trips/' + r._id, json('DELETE'));
                        bump((x) => x + 1);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            />
            <Pagination page={page} total={result.data.total} onPage={setPage} />
          </>
        )}
      </Card>
      {editing !== undefined && (
        <ModalForm
          title={editing ? 'Edit trip' : 'Add trip'}
          fields={tripFields(vehicles)}
          initial={editing || {}}
          onClose={() => setEditing(undefined)}
          onSave={async (d) => {
            await api(
              '/trips' + (editing ? '/' + editing._id : ''),
              json(editing ? 'PUT' : 'POST', d),
            );
            bump((x) => x + 1);
          }}
        />
      )}
      {detail && (
        <Detail
          title="Trip details"
          onClose={() => setDetail(null)}
          values={{
            Vehicle: detail.vehicle.name,
            Date: detail.date,
            'Distance (km)': detail.distanceKm,
            'Fuel (L)': detail.fuelL,
            'Fuel source': detail.fuelSource,
            'Price (₹/L)': detail.pricePerL,
            'Start odometer': detail.startOdometer,
            'End odometer': detail.endOdometer,
            'Duration (min)': detail.durationMinutes,
            'Average speed': detail.avgSpeed,
            'Idle time': detail.idleMinutes,
            Traffic: detail.traffic,
            Road: detail.road,
            Weather: detail.weather,
            Notes: detail.notes,
          }}
        />
      )}
    </>
  );
}
