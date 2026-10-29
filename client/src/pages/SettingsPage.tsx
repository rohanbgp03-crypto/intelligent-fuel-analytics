import { Check, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { api, json } from '../api';
import { Card, Message } from '../components';
import { useApp, type User } from '../state';
import { Heading } from '../workspace';

export default function SettingsPage() {
  const { user, setUser } = useApp(),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <Heading
        title="Make this workspace yours."
        sub="Profile, display preferences and account security."
      />
      <div className="grid-two">
        <Card title="Profile & preferences" sub="Indian units and INR are the supported defaults.">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              setSuccess('');
              const form = new FormData(e.currentTarget);
              try {
                setUser(
                  await api<User>(
                    '/settings',
                    json('PUT', {
                      name: form.get('name'),
                      currency: 'INR',
                      efficiencyUnit: form.get('efficiencyUnit'),
                      notifications: form.get('notifications') === 'on',
                    }),
                  ),
                );
                setSuccess('Preferences saved.');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Display name
              <input name="name" defaultValue={user?.name} maxLength={80} required />
            </label>
            <label>
              Email
              <input type="email" value={user?.email} readOnly />
              <small>Email changes are not supported in this version.</small>
            </label>
            <label>
              Preferred efficiency display
              <select name="efficiencyUnit" defaultValue={user?.settings.efficiencyUnit}>
                <option value="km/L">Kilometres per litre (km/L)</option>
                <option value="L/100km">Litres per 100 kilometres (L/100 km)</option>
              </select>
            </label>
            <label>
              Currency
              <select disabled>
                <option>INR (₹) — no currency conversion</option>
              </select>
            </label>
            <label className="check-label">
              <input
                name="notifications"
                type="checkbox"
                defaultChecked={user?.settings.notifications}
              />{' '}
              Show in-app recommendations
            </label>
            <small className="muted">
              No email, push notification or background delivery is included. Charts and exported
              reports show their own explicit units.
            </small>
            <button className="btn primary full" disabled={busy}>
              Save preferences
              <Check size={16} />
            </button>
          </form>
        </Card>
        <Card
          title="Change your password"
          sub="Changing it signs out all sessions, including this one."
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setSuccess('');
              setBusy(true);
              try {
                await api(
                  '/auth/password',
                  json('PUT', Object.fromEntries(new FormData(e.currentTarget))),
                );
                setUser(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </label>
            <button className="btn primary full" disabled={busy}>
              Change password
            </button>
          </form>
          <div className="formula">
            <ShieldCheck size={22} />
            <h3>Your account</h3>
            <p>
              Records are isolated by owner on the server. Session tokens are stored in HttpOnly
              cookies and expire after seven days. Passwords are hashed with bcrypt.
            </p>
            <p className="small-note">
              For account deletion, contact your deployment administrator. No automated deletion or
              password recovery flow is included.
            </p>
          </div>
        </Card>
      </div>
      <Message text={error} error />
      <Message text={success} />
    </>
  );
}
