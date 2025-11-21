import { useMemo, useRef, useCallback } from 'react';

type HistoryDay = {
  dateISO: string;
  totals: { calories: number; p: number; c: number; f: number };
  logCount: number;
};

type CacheEntry = {
  data: HistoryDay[];
  timestamp: number;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10; // Keep last 10 weeks

export function useHistoryCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const getCacheKey = useCallback((startDate: string, endDate: string) => {
    return `${startDate}_${endDate}`;
  }, []);

  const get = useCallback(
    (startDate: string, endDate: string): HistoryDay[] | null => {
      const key = getCacheKey(startDate, endDate);
      const entry = cacheRef.current.get(key);

      if (!entry) return null;

      const now = Date.now();
      if (now - entry.timestamp > CACHE_DURATION) {
        // Cache expired
        cacheRef.current.delete(key);
        return null;
      }

      return entry.data;
    },
    [getCacheKey],
  );

  const set = useCallback((startDate: string, endDate: string, data: HistoryDay[]) => {
    const cache = cacheRef.current;
    const key = getCacheKey(startDate, endDate);

    // Add new entry
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // If cache is too large, remove oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      cache.forEach((entry, k) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      });

      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
  }, [getCacheKey]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return useMemo(() => ({ get, set, clear }), [get, set, clear]);
}
