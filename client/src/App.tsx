import { Fuel } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import Shell from './layout';
import Analytics from './pages/Analytics';
import Auth from './pages/Auth';
import Calculator from './pages/Calculator';
import Dashboard from './pages/Dashboard';
import FuelLogs from './pages/FuelLogs';
import Landing from './pages/Landing';
import Predict from './pages/Predict';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import Trips from './pages/Trips';
import Vehicles from './pages/Vehicles';
import { Context, type User } from './state';
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [connection, setConnection] = useState(''),
    [vehicles, setVehicles] = useState<any[]>([]),
    [filters, setFilters] = useState<Record<string, string>>({});
  const loadVehicles = () => {
    api<any[]>('/vehicles')
      .then(setVehicles)
      .catch(() => setVehicles([]));
  };
  useEffect(() => {
    api<User>('/auth/me')
      .then(setUser)
      .catch((e) => {
        if (!/sign in|expired/i.test(e.message)) setConnection(e.message);
      })
      .finally(() => setReady(true));
    const expired = () => setUser(null);
    window.addEventListener('ifca-unauthorized', expired);
    return () => window.removeEventListener('ifca-unauthorized', expired);
  }, []);
  useEffect(() => {
    if (user) loadVehicles();
    else setVehicles([]);
  }, [user?.id]);
  if (!ready)
    return (
      <div className="startup">
        <Fuel size={35} />
        <p>Connecting to IFCA…</p>
      </div>
    );
  return (
    <Context.Provider value={{ user, setUser, vehicles, loadVehicles, filters, setFilters }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/auth"
          element={user ? <Navigate to="/app" replace /> : <Auth connection={connection} />}
        />
        <Route path="/app" element={user ? <Shell /> : <Navigate to="/auth" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="trips" element={<Trips />} />
          <Route path="fuel" element={<FuelLogs />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="predict" element={<Predict />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Context.Provider>
  );
}
