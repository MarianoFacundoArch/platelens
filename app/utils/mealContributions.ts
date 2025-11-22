import type { MealLog } from '@/hooks/useDailyMeals';
import type { getColors } from '@/config/theme';

export type MetricType = 'calories' | 'protein' | 'carbs' | 'fat';

export type MealContribution = {
  mealId: string;
  mealName: string;
  value: number;
  percentage: number;
  color: string;
};

/**
 * Calculate meal contributions for a specific metric
 */
export function calculateMealContributions(
  meals: MealLog[],
  metricType: MetricType,
  colors: ReturnType<typeof getColors>
): MealContribution[] {
  if (!meals || meals.length === 0) return [];

  // Calculate each meal's contribution to the metric
  const contributions = meals.map((meal) => {
    let value: number;
    switch (metricType) {
      case 'calories':
        value = meal.totalCalories;
        break;
      case 'protein':
        value = meal.macros.p;
        break;
      case 'carbs':
        value = meal.macros.c;
        break;
      case 'fat':
        value = meal.macros.f;
        break;
      default:
        value = 0;
    }

    return {
      mealId: meal.id,
      mealName: meal.dishTitle || getMealTypeName(meal.mealType),
      value,
      meal, // Keep reference for sorting by timestamp
    };
  });

  // Calculate total
  const total = contributions.reduce((sum, c) => sum + c.value, 0);

  // Sort by contribution (largest first)
  const sorted = contributions.sort((a, b) => b.value - a.value);

  // Assign colors and calculate percentages
  return sorted.map((contribution, index) => ({
    mealId: contribution.mealId,
    mealName: contribution.mealName,
    value: contribution.value,
    percentage: total > 0 ? (contribution.value / total) * 100 : 0,
    color: getMealGradientColor(index, colors),
  }));
}

/**
 * Get color for meal based on rank (teal gradient)
 */
export function getMealGradientColor(
  rank: number,
  colors: ReturnType<typeof getColors>
): string {
  // Largest meal gets darkest, smallest gets lightest
  const colorMap = [
    colors.primary[700], // 1st place (largest)
    colors.primary[600], // 2nd
    colors.primary[500], // 3rd
    colors.primary[400], // 4th
    colors.primary[300], // 5th+
  ];

  return colorMap[Math.min(rank, colorMap.length - 1)];
}

/**
 * Generate smart nutritional insight based on contribution pattern
 * Returns null if no notable pattern exists
 */
export function generateInsight(
  metricType: MetricType,
  contributions: MealContribution[],
  total: number,
  target?: number
): string | null {
  if (contributions.length === 0) return null;

  const largest = contributions[0];
  const isBalanced = contributions.every((c) => c.percentage >= 20 && c.percentage <= 35);

  switch (metricType) {
    case 'calories':
      if (largest.percentage > 45) {
        return `${largest.mealName} accounts for ${Math.round(largest.percentage)}% of your daily intake`;
      }
      if (isBalanced && contributions.length >= 3) {
        return 'Your meals are well-balanced throughout the day';
      }
      break;

    case 'protein':
      if (largest.value > 40) {
        return `${largest.mealName} provided ${Math.round(largest.value)}g protein - your body processes ~40g optimally per meal`;
      }
      if (isBalanced && contributions.length >= 3) {
        return 'Great! Protein is distributed across all meals';
      }
      // Check for low breakfast protein
      const breakfast = contributions.find((c) =>
        c.mealName.toLowerCase().includes('breakfast')
      );
      if (breakfast && breakfast.value < 15 && total > 50) {
        return 'Consider adding more protein to breakfast for sustained energy';
      }
      break;

    case 'carbs':
      // Check if dinner is carb-heavy
      const dinner = contributions.find((c) => c.mealName.toLowerCase().includes('dinner'));
      if (dinner && dinner.percentage > 40) {
        return 'Evening carb-heavy meals may affect sleep quality';
      }
      // Check for front-loaded carbs
      const lunch = contributions.find((c) => c.mealName.toLowerCase().includes('lunch'));
      const breakfastCarbs = contributions.find((c) =>
        c.mealName.toLowerCase().includes('breakfast')
      );
      if (
        breakfastCarbs &&
        lunch &&
        breakfastCarbs.percentage + lunch.percentage > 60
      ) {
        return 'Carbs are front-loaded - good for sustained energy throughout the day';
      }
      break;

    case 'fat':
      if (largest.percentage > 60) {
        return 'Most fat came from one meal - spreading it across meals helps absorption';
      }
      if (isBalanced && contributions.length >= 3) {
        return 'Healthy fat distribution across meals aids satiety';
      }
      break;
  }

  return null;
}

/**
 * Get display name for meal type
 */
function getMealTypeName(
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'snack' | 'dinner' | 'pre-workout' | 'post-workout'
): string {
  if (!mealType) return 'Meal';

  const names: Record<string, string> = {
    breakfast: 'Breakfast',
    brunch: 'Brunch',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
    'pre-workout': 'Pre-workout',
    'post-workout': 'Post-workout',
  };

  return names[mealType] || 'Meal';
}

/**
 * Get metric display info
 */
export function getMetricDisplayInfo(metricType: MetricType) {
  switch (metricType) {
    case 'calories':
      return { name: 'Calorie', unit: 'cal', pluralName: 'Calories' };
    case 'protein':
      return { name: 'Protein', unit: 'g', pluralName: 'Protein' };
    case 'carbs':
      return { name: 'Carbs', unit: 'g', pluralName: 'Carbs' };
    case 'fat':
      return { name: 'Fat', unit: 'g', pluralName: 'Fat' };
    default:
      return { name: 'Metric', unit: '', pluralName: 'Metrics' };
  }
}
