import { Car, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, json } from '../api';
import { Card, Empty, Message, ModalForm, type Field } from '../components';
import { useApp } from '../state';
import { number as n } from '../utils';
import { Heading } from '../workspace';

const vehicleFields: Field[] = [
  { name: 'name', label: 'Vehicle name', required: true },
  { name: 'registration', label: 'Registration identifier' },
  {
    name: 'type',
    label: 'Vehicle type',
    required: true,
    options: ['car', 'suv', 'motorbike', 'van', 'truck'].map((x) => ({
      value: x,
      label: x.toUpperCase(),
    })),
    default: 'car',
  },
  {
    name: 'fuelType',
    label: 'Fuel type',
    required: true,
    options: ['petrol', 'diesel', 'hybrid'].map((x) => ({ value: x, label: x })),
    default: 'petrol',
  },
  { name: 'make', label: 'Make' },
  { name: 'model', label: 'Model' },
  { name: 'year', label: 'Model year', type: 'number', min: 1950, max: 2100, step: '1' },
  {
    name: 'engineL',
    label: 'Engine capacity (L)',
    type: 'number',
    min: 0.05,
    max: 20,
    hint: 'Required for ML prediction',
  },
  {
    name: 'weightKg',
    label: 'Vehicle weight (kg)',
    type: 'number',
    min: 50,
    max: 50000,
    hint: 'Required for ML prediction',
  },
  { name: 'expectedMileage', label: 'Rated mileage (km/L)', type: 'number', min: 0.1, max: 150 },
  {
    name: 'odometer',
    label: 'Odometer (km)',
    type: 'number',
    min: 0,
    max: 10000000,
    required: true,
    default: 0,
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];
export default function Vehicles() {
  const { vehicles, loadVehicles, setFilters } = useApp(),
    navigate = useNavigate(),
    [editing, setEditing] = useState<any>(undefined),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const remove = async (v: any) => {
    if (!confirm(`Delete ${v.name}? Vehicles with history must have their records removed first.`))
      return;
    setError('');
    setBusy(true);
    try {
      await api('/vehicles/' + v._id, json('DELETE'));
      loadVehicles();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        title="Your fleet, organised."
        sub="Vehicle details give your records the right context."
        action={
          <button className="btn primary" onClick={() => setEditing(null)}>
            <Plus size={16} />
            Add vehicle
          </button>
        }
      />
      <Message text={error} error />
      {vehicles.length ? (
        <div className="vehicle-grid">
          {vehicles.map((v) => (
            <article className="vehicle-card" key={v._id}>
              <div className="vehicle-card-top">
                <span className="vehicle-icon">
                  <Car size={26} />
                </span>
                <span className="pill">{v.fuelType}</span>
              </div>
              <h2>{v.name}</h2>
              <p>{[v.make, v.model, v.year].filter(Boolean).join(' ') || v.type}</p>
              <dl>
                <div>
                  <dt>Odometer</dt>
                  <dd>{n(v.odometer, 0)} km</dd>
                </div>
                <div>
                  <dt>Engine</dt>
                  <dd>{v.engineL ? n(v.engineL) + ' L' : 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>{v.weightKg ? n(v.weightKg, 0) + ' kg' : 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Rated mileage</dt>
                  <dd>{v.expectedMileage ? n(v.expectedMileage) + ' km/L' : 'Not recorded'}</dd>
                </div>
              </dl>
              <p className="small-note">{v.registration || 'No registration recorded'}</p>
              <p className="small-note">{v.notes}</p>
              <div className="record-actions">
                <button
                  className="text-link"
                  onClick={() => {
                    setFilters({ vehicle: v._id });
                    navigate('/app/trips');
                  }}
                >
                  View history →
                </button>
                <button
                  className="icon-button"
                  onClick={() => setEditing(v)}
                  aria-label={'Edit ' + v.name}
                >
                  <Pencil size={16} />
                </button>
                <button
                  disabled={busy}
                  className="icon-button danger"
                  onClick={() => remove(v)}
                  aria-label={'Delete ' + v.name}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Card title="A home for your vehicles">
          <Empty text="Add your first vehicle to begin logging trips and refills." />
        </Card>
      )}
      {editing !== undefined && (
        <ModalForm
          title={editing ? 'Edit vehicle' : 'Add vehicle'}
          fields={vehicleFields}
          initial={editing || {}}
          onClose={() => setEditing(undefined)}
          onSave={async (d) => {
            await api(
              '/vehicles' + (editing ? '/' + editing._id : ''),
              json(editing ? 'PUT' : 'POST', d),
            );
            loadVehicles();
          }}
        />
      )}
      <p className="small-note">
        The vehicle odometer is a manually maintained reference. Trip and refill readings are stored
        independently. Vehicles with history cannot be deleted until dependent records are removed.
      </p>
    </>
  );
}
