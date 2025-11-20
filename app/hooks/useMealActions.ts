import { useState } from 'react';
import { deleteMeal, updateMeal } from '@/lib/api';
import { useHaptics } from './useHaptics';
import { MealLog } from './useDailyMeals';

type SelectedMeal = {
  meal: MealLog;
  index: number;
} | null;

type UseMealActionsReturn = {
  selectedMeal: SelectedMeal;
  handleMealPress: (meal: MealLog, index: number) => void;
  handleDeleteMeal: (mealId: string) => Promise<void>;
  handleUpdateMeal: (mealId: string, updates: { portionMultiplier?: number; mealType?: string }) => Promise<void>;
  closeDetailSheet: () => void;
};

/**
 * Reusable hook for meal interaction logic (view, delete, update)
 * Used in both home and history views
 */
export function useMealActions(reloadMeals: (options?: { silent?: boolean }) => Promise<void>): UseMealActionsReturn {
  const { light } = useHaptics();
  const [selectedMeal, setSelectedMeal] = useState<SelectedMeal>(null);

  const handleMealPress = (meal: MealLog, index: number) => {
    light();
    setSelectedMeal({ meal, index });
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteMeal(mealId);
      await reloadMeals({ silent: true });
    } catch (error) {
      console.warn('Failed to delete meal:', error);
      throw error;
    }
  };

  const handleUpdateMeal = async (
    mealId: string,
    updates: { portionMultiplier?: number; mealType?: string }
  ) => {
    try {
      console.log('[meal-update] submitting', { mealId, updates });
      await updateMeal(mealId, updates);
      console.log('[meal-update] success', { mealId });
      await reloadMeals({ silent: true });
    } catch (error) {
      console.warn('[meal-update] failed', error);
      throw error;
    }
  };

  const closeDetailSheet = () => {
    setSelectedMeal(null);
  };

  return {
    selectedMeal,
    handleMealPress,
    handleDeleteMeal,
    handleUpdateMeal,
    closeDetailSheet,
  };
}
