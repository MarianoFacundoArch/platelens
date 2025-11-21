import { useCallback, useEffect, useState } from 'react';

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

  const loadMeals = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await getMeals(dateISO);
        setData(response);
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
    refresh,
    reload: loadMeals,
  };
}
