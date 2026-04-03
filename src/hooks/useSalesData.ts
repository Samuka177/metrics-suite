import { useState, useCallback, useEffect } from 'react';
import { SaleRecord } from '@/types/sales';

const STORAGE_KEY = 'logidash_data';

export function useSalesData() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const restored = parsed.map((r: any) => ({ ...r, date: new Date(r.date) }));
        setRecords(restored);
      }
    } catch {}
  }, []);

  const saveRecords = useCallback((data: SaleRecord[]) => {
    setRecords(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  const clearData = useCallback(() => {
    setRecords([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { records, setRecords: saveRecords, loading, setLoading, clearData };
}
