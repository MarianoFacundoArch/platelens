import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { getMeals } from '@/lib/api';

export type MealLog = {
  id: string;
  dishTitle?: string;
  status?: 'pending_scan' | 'ready' | 'cancelled';
  scanId?: string;
  ingredientsList?: Array<{
    name: string;
    calories: number;
    macros: { p: number; c: number; f: number };
  }>;
  items?: Array<{
    name: string;
    calories: number;
    macros: { p: number; c: number; f: number };
  }>;
  totalCalories: number;
  createdAt?: string;
  imageUrl?: string;
  imageUri?: string;
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'snack' | 'dinner' | 'pre-workout' | 'post-workout';
  portionMultiplier?: number;
};

export type MealData = {
  logs: MealLog[];
  totals: {
    calories: number;
    p: number;
    c: number;
    f: number;
  };
  dateISO?: string;
};

export function useDailyMeals(dateISO?: string) {
  const [data, setData] = useState<MealData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const loadMeals = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await getMeals(dateISO);

        // Sort meals: pending_scan items first, then by creation time (newest first)
        if (response?.logs) {
          response.logs.sort((a: MealLog, b: MealLog) => {
            // Pending scans always come first
            if (a.status === 'pending_scan' && b.status !== 'pending_scan') return -1;
            if (a.status !== 'pending_scan' && b.status === 'pending_scan') return 1;

            // Within same status, sort by creation time (newest first)
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
        }

        setData(response);
        setLastUpdated(new Date());
      } catch (err) {
        console.warn('Failed to load meals:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateISO],
  );

  // Check if there are any pending scans
  const hasPendingScans = useCallback(() => {
    return data?.logs?.some((log) => log.status === 'pending_scan') ?? false;
  }, [data]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    pollingIntervalRef.current = setInterval(() => {
      loadMeals({ silent: true });
    }, 4000); // Poll every 4 seconds
  }, [loadMeals]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Handle AppState changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isActive = nextAppState === 'active';

      if (wasBackground && isActive) {
        // App came to foreground - resume polling if there are pending scans
        if (hasPendingScans()) {
          startPolling();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop polling
        stopPolling();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [hasPendingScans, startPolling, stopPolling]);

  // Set up/tear down polling based on pending scans
  useEffect(() => {
    if (hasPendingScans() && appStateRef.current === 'active') {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [hasPendingScans, startPolling, stopPolling]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  const refresh = () => {
    setIsRefreshing(true);
    return loadMeals({ silent: true });
  };

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh,
    reload: loadMeals,
  };
}
