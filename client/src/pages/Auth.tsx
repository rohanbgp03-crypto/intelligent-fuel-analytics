import { Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, json } from '../api';
import { Message } from '../components';
import { useApp, type User } from '../state';
import { Logo } from '../workspace';

export default function Auth({ connection }: { connection: string }) {
  const { setUser } = useApp(),
    [mode, setMode] = useState('login'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Logo />
        <div>
          <div className="eyebrow">EVERY LITRE TELLS A STORY</div>
          <h1>
            A clearer view
            <br />
            of the road ahead.
          </h1>
          <p>
            Understand consumption. Track costs.
            <br />
            Make informed decisions.
          </p>
          <div className="auth-lines">
            <Activity size={130} strokeWidth={0.8} />
          </div>
        </div>
        <small>INTELLIGENT FUEL CONSUMPTION ANALYTICS</small>
      </div>
      <div className="auth-form">
        <div className="mobile-logo">
          <Logo />
        </div>
        <div className="eyebrow">YOUR PRIVATE WORKSPACE</div>
        <h2>{mode === 'login' ? 'Welcome back.' : 'Let’s get you started.'}</h2>
        <p>
          {mode === 'login'
            ? 'Sign in to your fuel analytics workspace.'
            : 'Create an account to start recording your journeys.'}
        </p>
        <Message text={connection} error />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const d = Object.fromEntries(new FormData(e.currentTarget));
            try {
              setUser(
                await api<User>(
                  '/auth/' + (mode === 'login' ? 'login' : 'register'),
                  json('POST', d),
                ),
              );
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === 'register' && (
            <label>
              Your name
              <input name="name" autoComplete="name" maxLength={80} required />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" maxLength={254} required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 10 : 1}
              maxLength={128}
              required
            />
          </label>
          {mode === 'register' && <small>Use at least 10 characters.</small>}
          <Message text={error} error />
          <button className="btn primary full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="switch-auth">
          {mode === 'login' ? 'New to IFCA?' : 'Already have an account?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        <div className="auth-security">
          <ShieldCheck size={16} /> Passwords are hashed. Your records belong to your account.
        </div>
        <Link className="muted" to="/">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
