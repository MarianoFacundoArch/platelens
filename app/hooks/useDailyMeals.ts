import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { getMeals } from '@/lib/api';
import { formatLocalDateISO } from '@/lib/dateUtils';

export type MealLog = {
  id: string;
  dishTitle?: string;
  status?: 'pending_scan' | 'ready' | 'cancelled';
  scanId?: string;
  ingredientsList?: Array<{
    name: string;
    calories: number;
    macros: { p: number; c: number; f: number };
    id?: string;
    imageUrl?: string;
    estimated_weight_g?: number;
    notes?: string;
  }>;
  items?: Array<{
    name: string;
    calories: number;
    macros: { p: number; c: number; f: number };
  }>;
  totalCalories: number;
  macros: { p: number; c: number; f: number };
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

export function useDailyMeals(dateISO?: string, openMealId?: string) {
  const targetDateISO = dateISO ?? formatLocalDateISO();
  const [data, setData] = useState<MealData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pollingStartTimeRef = useRef<number | null>(null);

  const loadMeals = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await getMeals(targetDateISO);

        console.log('[useDailyMeals] Meals loaded:', {
          totalMeals: response?.logs?.length || 0,
          meals: response?.logs?.map((m: MealLog) => ({
            id: m.id,
            title: m.dishTitle,
            status: m.status,
            ingredientsCount: m.ingredientsList?.length || 0,
            ingredients: m.ingredientsList?.map((i) => ({
              name: i.name,
              id: i.id,
              hasImageUrl: !!i.imageUrl
            }))
          }))
        });

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
    [targetDateISO],
  );

  // Check if there are any pending scans
  const hasPendingScans = useCallback(() => {
    return data?.logs?.some((log) => log.status === 'pending_scan') ?? false;
  }, [data]);

  // Check if a specific meal has ingredients with generating images
  const mealHasGeneratingImages = useCallback((mealId: string) => {
    const meal = data?.logs?.find((log) => log.id === mealId);
    if (!meal || !meal.ingredientsList) {
      console.log('[useDailyMeals] mealHasGeneratingImages: meal not found or no ingredients list', { mealId, hasMeal: !!meal, hasIngredients: !!meal?.ingredientsList });
      return false;
    }

    const generatingIngredients = meal.ingredientsList.filter((ingredient) => {
      // Has ingredient ID but no image URL means it's generating
      return ingredient.id && !ingredient.imageUrl;
    });

    console.log('[useDailyMeals] mealHasGeneratingImages check:', {
      mealId,
      totalIngredients: meal.ingredientsList.length,
      generatingCount: generatingIngredients.length,
      generatingNames: generatingIngredients.map(i => i.name),
      allIngredients: meal.ingredientsList.map(i => ({ name: i.name, id: i.id, hasImageUrl: !!i.imageUrl }))
    });

    return generatingIngredients.length > 0;
  }, [data]);

  // Check if we should be polling
  const shouldPoll = useCallback(() => {
    const hasPending = hasPendingScans();
    const hasGeneratingImages = openMealId ? mealHasGeneratingImages(openMealId) : false;

    console.log('[useDailyMeals] shouldPoll check:', {
      hasPendingScans: hasPending,
      openMealId,
      hasGeneratingImages,
      pollingStartTime: pollingStartTimeRef.current
    });

    // Always poll if there are pending scans
    if (hasPending) return true;

    // Poll if an open meal has ingredients generating images
    if (openMealId && hasGeneratingImages) {
      // But stop after 5 minutes to prevent infinite polling
      if (pollingStartTimeRef.current) {
        const elapsed = Date.now() - pollingStartTimeRef.current;
        console.log('[useDailyMeals] Polling elapsed time:', elapsed, 'ms');
        if (elapsed > 300000) { // 5 minutes
          console.log('[useDailyMeals] Polling timeout reached (5 minutes)');
          return false;
        }
      }
      return true;
    }

    return false;
  }, [hasPendingScans, openMealId, mealHasGeneratingImages]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('[useDailyMeals] Already polling, skipping startPolling');
      return; // Already polling
    }

    console.log('[useDailyMeals] Starting polling (every 4 seconds)');
    pollingStartTimeRef.current = Date.now();
    pollingIntervalRef.current = setInterval(() => {
      console.log('[useDailyMeals] Polling tick - fetching meals...');
      loadMeals({ silent: true });
    }, 4000); // Poll every 4 seconds
  }, [loadMeals]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('[useDailyMeals] Stopping polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      pollingStartTimeRef.current = null;
    }
  }, []);

  // Handle AppState changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isActive = nextAppState === 'active';

      if (wasBackground && isActive) {
        // App came to foreground - resume polling if needed
        if (shouldPoll()) {
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
  }, [shouldPoll, startPolling, stopPolling]);

  // Set up/tear down polling based on pending scans and open meal images
  useEffect(() => {
    const should = shouldPoll();
    const isActive = appStateRef.current === 'active';

    console.log('[useDailyMeals] Polling useEffect triggered:', {
      shouldPoll: should,
      appState: appStateRef.current,
      isActive,
      willStartPolling: should && isActive
    });

    if (should && isActive) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [shouldPoll, startPolling, stopPolling]);

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
