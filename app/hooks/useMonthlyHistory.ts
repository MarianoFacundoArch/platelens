import { useState, useEffect } from 'react';
import { getMealHistory } from '@/lib/api';
import { formatLocalDateISO } from '@/lib/dateUtils';

type HistoryDay = {
  dateISO: string;
  totals: { calories: number; p: number; c: number; f: number };
  logCount: number;
};

export function useMonthlyHistory(year: number, month: number) {
  const [data, setData] = useState<HistoryDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMonthData();
  }, [year, month]);

  const loadMonthData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get first and last day of the month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const startDate = formatLocalDateISO(firstDay);
      const endDate = formatLocalDateISO(lastDay);

      const response = await getMealHistory({ startDate, endDate });
      setData(response?.days ?? []);
    } catch (err) {
      console.warn('Failed to load monthly history:', err);
      setError('Failed to load month data');
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refresh: loadMonthData };
}
