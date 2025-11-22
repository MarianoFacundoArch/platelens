import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroPieChart } from '@/components/MacroPieChart';
import { MealList } from '@/components/MealList';
import { MetricBreakdownSheet } from '@/components/MetricBreakdownSheet';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { formatTimeAgo } from '@/lib/dateUtils';
import { MealLog } from '@/hooks/useDailyMeals';
import { UserTargets } from '@/hooks/useUserTargets';
import type { MetricType } from '@/utils/mealContributions';

type DailyViewProps = {
  selectedDate: string;
  today: string;
  mealsData: {
    logs: MealLog[];
    totals: { calories: number; p: number; c: number; f: number };
  } | null;
  isDayLoading: boolean;
  lastUpdated?: Date | null;
  targets: UserTargets;
  onPreviousDay: () => void;
  onNextDay: () => void;
  isAtToday: boolean;
  onJumpToToday: () => void;
  onMealPress?: (meal: MealLog, index: number) => void;
  onMealEdit?: (meal: MealLog, index: number) => void;
  onMealDelete?: (mealId: string) => void;
};

function toDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`);
}

function formatDateLabel(dateISO: string, today: string) {
  if (dateISO === today) return 'Today';
  const date = toDate(dateISO);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function DailyView({
  selectedDate,
  today,
  mealsData,
  isDayLoading,
  lastUpdated,
  targets,
  onPreviousDay,
  onNextDay,
  isAtToday,
  onJumpToToday,
  onMealPress,
  onMealEdit,
  onMealDelete,
}: DailyViewProps) {
  const meals = mealsData?.logs ?? [];
  const mealCount = meals.length;
  const [, setTicker] = useState(0); // Force re-render every second to update "X ago" text
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const { colors } = useTheme();
  const { light } = useHaptics();

  // Dynamic styles based on theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Update timestamp display every second
  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Handlers for metric breakdown
  const handleCaloriePress = () => {
    if ((mealsData?.totals.calories || 0) > 0) {
      light();
      setSelectedMetric('calories');
    }
  };

  const handleProteinPress = () => {
    if ((mealsData?.totals.p || 0) > 0) {
      light();
      setSelectedMetric('protein');
    }
  };

  const handleCarbsPress = () => {
    if ((mealsData?.totals.c || 0) > 0) {
      light();
      setSelectedMetric('carbs');
    }
  };

  const handleFatPress = () => {
    if ((mealsData?.totals.f || 0) > 0) {
      light();
      setSelectedMetric('fat');
    }
  };

  const handleMealPressFromBreakdown = (mealId: string) => {
    setSelectedMetric(null);
    const meal = meals.find(m => m.id === mealId);
    const index = meals.findIndex(m => m.id === mealId);
    if (meal && onMealPress) {
      onMealPress(meal, index);
    }
  };

  const getTotalForMetric = (metricType: MetricType): number => {
    switch (metricType) {
      case 'calories':
        return mealsData?.totals.calories || 0;
      case 'protein':
        return mealsData?.totals.p || 0;
      case 'carbs':
        return mealsData?.totals.c || 0;
      case 'fat':
        return mealsData?.totals.f || 0;
      default:
        return 0;
    }
  };

  const getTargetForMetric = (metricType: MetricType): number | undefined => {
    switch (metricType) {
      case 'calories':
        return targets.calories;
      case 'protein':
        return targets.protein;
      case 'carbs':
        return targets.carbs;
      case 'fat':
        return targets.fat;
      default:
        return undefined;
    }
  };

  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <Pressable onPress={onPreviousDay} style={styles.navButton}>
          {({ pressed }) => (
            <View style={[styles.navButtonInner, pressed && styles.navButtonPressed]}>
              <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
            </View>
          )}
        </Pressable>

        <View style={styles.dateLabel}>
          <Text style={styles.dateLabelText}>{formatDateLabel(selectedDate, today)}</Text>
          {mealCount > 0 && (
            <Text style={styles.mealCount}>{mealCount} {mealCount === 1 ? 'meal' : 'meals'}</Text>
          )}
        </View>

        <Pressable
          onPress={onNextDay}
          style={styles.navButton}
          disabled={isAtToday}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.navButtonInner,
                pressed && styles.navButtonPressed,
                isAtToday && styles.navButtonDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isAtToday ? colors.ink[300] : colors.text.primary}
              />
            </View>
          )}
        </Pressable>
      </View>

      {/* Last Updated Timestamp */}
      {lastUpdated && (
        <Text style={styles.timestampText}>Updated {formatTimeAgo(lastUpdated)}</Text>
      )}

      {!isAtToday && (
        <Pressable onPress={onJumpToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Jump to Today</Text>
        </Pressable>
      )}

      {isDayLoading ? (
        <Card variant="elevated" padding="lg" style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingMuted}>Loading day...</Text>
        </Card>
      ) : (
        <>
          {/* Calorie Ring Card */}
          <Card variant="elevated" padding="lg" style={styles.ringCard}>
            <Pressable onPress={handleCaloriePress}>
              <CalorieRing
                consumed={mealsData?.totals.calories || 0}
                target={targets.calories}
                size="lg"
                animated
              />
            </Pressable>
          </Card>

          {/* Macros Card */}
          <Card variant="elevated" padding="lg" style={styles.macrosCard}>
            <Text style={styles.sectionTitle}>Macronutrients</Text>
            <MacroPieChart
              current={{
                protein: mealsData?.totals.p || 0,
                carbs: mealsData?.totals.c || 0,
                fat: mealsData?.totals.f || 0,
              }}
              target={{
                protein: targets.protein,
                carbs: targets.carbs,
                fat: targets.fat,
              }}
              onProteinPress={handleProteinPress}
              onCarbsPress={handleCarbsPress}
              onFatPress={handleFatPress}
            />
          </Card>

          {/* Meals List */}
          {!meals.length ? (
            <Card variant="elevated" padding="lg" style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="restaurant-outline" size={40} color={colors.ink[300]} />
              </View>
              <Text style={styles.emptyTitle}>No meals logged</Text>
              <Text style={styles.emptySubtitle}>Select a different date to view meal history</Text>
            </Card>
          ) : (
            <Card variant="elevated" padding="lg" style={styles.mealsCard}>
              <View style={styles.mealsHeader}>
                <Text style={styles.sectionTitle}>Meals</Text>
                <Ionicons name="restaurant-outline" size={20} color={colors.text.tertiary} />
              </View>
              <MealList
                meals={meals}
                onPress={onMealPress}
                onEdit={onMealEdit}
                onDelete={onMealDelete}
              />
            </Card>
          )}
        </>
      )}

      {/* Metric Breakdown Sheet */}
      {selectedMetric && (
        <MetricBreakdownSheet
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          metricType={selectedMetric}
          meals={meals}
          total={getTotalForMetric(selectedMetric)}
          target={getTargetForMetric(selectedMetric)}
          onMealPress={handleMealPressFromBreakdown}
          selectedDate={selectedDate}
          today={today}
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      gap: 16,
    },
    dateNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 4,
      gap: 8,
    },
    navButton: {
      width: 40,
      height: 40,
    },
    navButtonInner: {
      flex: 1,
      borderRadius: 20,
      backgroundColor: colors.background.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonPressed: {
      backgroundColor: colors.border.subtle,
      transform: [{ scale: 0.94 }],
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    todayButton: {
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.primary[50],
      marginBottom: 8,
    },
    todayButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary[600],
      letterSpacing: 0.2,
    },
    dateLabel: {
      flex: 1,
      alignItems: 'center',
    },
    dateLabelText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: 0.2,
    },
    mealCount: {
      fontSize: 13,
      color: colors.text.secondary,
      marginTop: 2,
      fontWeight: '500',
    },
    timestampText: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontWeight: '500',
      textAlign: 'right',
      marginTop: 8,
      marginBottom: 8,
    },
    ringCard: {
      marginBottom: 0,
    },
    macrosCard: {
      marginBottom: 0,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 16,
      letterSpacing: 0.2,
    },
    mealsCard: {
      marginBottom: 0,
    },
    mealsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    loadingCard: {
      gap: 12,
      alignItems: 'center',
      paddingVertical: 32,
    },
    loadingMuted: {
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    emptyCard: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 40,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.background.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      letterSpacing: 0.2,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      fontWeight: '500',
      paddingHorizontal: 20,
    },
  });
}
