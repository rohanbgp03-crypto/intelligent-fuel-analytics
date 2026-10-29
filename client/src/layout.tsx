import {
  BarChart3,
  Calculator as CalculatorIcon,
  Car,
  ChevronRight,
  ClipboardList,
  FileText,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api, json } from './api';
import { Message } from './components';
import { useApp } from './state';
import { Logo } from './workspace';
const navigation = [
  ['', 'Overview', LayoutDashboard],
  ['vehicles', 'Vehicles', Car],
  ['trips', 'Trip records', ClipboardList],
  ['fuel', 'Fuel log', Fuel],
  ['analytics', 'Analytics', BarChart3],
  ['predict', 'ML predictor', Sparkles],
  ['calculator', 'Cost calculator', CalculatorIcon],
  ['reports', 'Reports', FileText],
  ['settings', 'Settings', Settings],
] as const;
export default function Shell() {
  const { user, setUser } = useApp(),
    location = useLocation(),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const route = location.pathname.split('/')[2] || '',
    title = navigation.find((x) => x[0] === route)?.[1] || 'Workspace';
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <div className="app-shell">
      <aside className={open ? 'open' : ''}>
        <div className="aside-top">
          <Logo />
          <button
            className="icon-button mobile"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={21} />
          </button>
        </div>
        <div className="sidebar-kicker">INTELLIGENT FUEL ANALYTICS</div>
        <nav>
          {navigation.map(([path, label, Icon]) => (
            <NavLink end={path === ''} to={'/app' + (path ? '/' + path : '')} key={label}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="status-dot" /> Connected workspace
          <p>
            Private records.
            <br />
            Clearer decisions.
          </p>
          <small>IFCA · CSE PROJECT V2.0</small>
        </div>
      </aside>
      {open && (
        <button
          className="nav-overlay"
          onClick={() => setOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}
      <div className="app-main">
        <header className="app-header no-print">
          <div>
            <button
              className="icon-button mobile"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{title}</b>
          </div>
          <div>
            <span className="header-name">{user?.name}</span>
            <span className="avatar">{user?.name.slice(0, 2).toUpperCase()}</span>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await api('/auth/logout', json('POST'));
                  setUser(null);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main>
          <Message text={error} error />
          <Outlet />
        </main>
        <footer className="app-footer">
          <b>IFCA</b>
          <span>Intelligent Fuel Consumption Analytics</span>
          <span>Understand every litre.</span>
        </footer>
      </div>
    </div>
  );
}
