import { useState, useCallback } from 'react';
import { FilterState } from '@/types/sales';
import { startOfMonth, endOfMonth } from 'date-fns';

const defaultFilters: FilterState = {
  dateFrom: startOfMonth(new Date()),
  dateTo: endOfMonth(new Date()),
  channels: [],
  sellers: [],
  regions: [],
  compareWith: 'same_month_ly',
};

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  return { filters, updateFilter, resetFilters };
}
