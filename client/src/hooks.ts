import { useEffect, useRef, useState } from 'react';
import { api } from './api';
export function useData<T = any>(url: string, revision = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    req = useRef(0);
  useEffect(() => {
    const id = ++req.current;
    setLoading(true);
    setError('');
    api<T>(url)
      .then((d) => {
        if (id === req.current) setData(d);
      })
      .catch((e) => {
        if (id === req.current) {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (id === req.current) setLoading(false);
      });
    return () => {
      req.current++;
    };
  }, [url, revision]);
  return { data, error, loading };
}
