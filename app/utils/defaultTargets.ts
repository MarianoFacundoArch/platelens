/**
 * Default daily nutritional targets
 * Used as fallback when user hasn't configured custom goals
 */

export const DEFAULT_DAILY_TARGETS = {
  calories: 2000,
  protein: 150, // grams
  carbs: 200,   // grams
  fat: 65,      // grams
} as const;

export type DailyTargets = typeof DEFAULT_DAILY_TARGETS;
