import { useState, useCallback } from 'react';

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
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());

  const getCacheKey = (startDate: string, endDate: string) => {
    return `${startDate}_${endDate}`;
  };

  const get = useCallback(
    (startDate: string, endDate: string): HistoryDay[] | null => {
      const key = getCacheKey(startDate, endDate);
      const entry = cache.get(key);

      if (!entry) return null;

      const now = Date.now();
      if (now - entry.timestamp > CACHE_DURATION) {
        // Cache expired
        setCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(key);
          return newCache;
        });
        return null;
      }

      return entry.data;
    },
    [cache],
  );

  const set = useCallback((startDate: string, endDate: string, data: HistoryDay[]) => {
    setCache((prev) => {
      const newCache = new Map(prev);
      const key = getCacheKey(startDate, endDate);

      // Add new entry
      newCache.set(key, {
        data,
        timestamp: Date.now(),
      });

      // If cache is too large, remove oldest entries
      if (newCache.size > MAX_CACHE_SIZE) {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        newCache.forEach((entry, k) => {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = k;
          }
        });

        if (oldestKey) {
          newCache.delete(oldestKey);
        }
      }

      return newCache;
    });
  }, []);

  const clear = useCallback(() => {
    setCache(new Map());
  }, []);

  return { get, set, clear };
}
