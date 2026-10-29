import { createContext, useContext } from 'react';
export type User = {
  id: string;
  name: string;
  email: string;
  settings: { currency: string; efficiencyUnit: string; notifications: boolean };
};
export type ContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  vehicles: any[];
  loadVehicles: () => void;
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
};
export const Context = createContext<ContextType>(null!);
export const useApp = () => useContext(Context);
