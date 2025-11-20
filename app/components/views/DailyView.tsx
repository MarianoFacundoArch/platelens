import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroPieChart } from '@/components/MacroPieChart';
import { MealList } from '@/components/MealList';
import { theme } from '@/config/theme';
import { MealLog } from '@/hooks/useDailyMeals';
import { UserTargets } from '@/hooks/useUserTargets';

type DailyViewProps = {
  selectedDate: string;
  today: string;
  mealsData: {
    logs: MealLog[];
    totals: { calories: number; p: number; c: number; f: number };
  } | null;
  isDayLoading: boolean;
  targets: UserTargets;
  onPreviousDay: () => void;
  onNextDay: () => void;
  isAtToday: boolean;
  onJumpToToday: () => void;
  onMealPress?: (meal: MealLog, index: number) => void;
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
  targets,
  onPreviousDay,
  onNextDay,
  isAtToday,
  onJumpToToday,
  onMealPress,
}: DailyViewProps) {
  const meals = mealsData?.logs ?? [];
  const mealCount = meals.length;

  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <Pressable onPress={onPreviousDay} style={styles.navButton}>
          {({ pressed }) => (
            <View style={[styles.navButtonInner, pressed && styles.navButtonPressed]}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.ink[700]} />
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
                color={isAtToday ? theme.colors.ink[300] : theme.colors.ink[700]}
              />
            </View>
          )}
        </Pressable>
      </View>

      {!isAtToday && (
        <Pressable onPress={onJumpToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Jump to Today</Text>
        </Pressable>
      )}

      {isDayLoading ? (
        <Card variant="elevated" padding="lg" style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingMuted}>Loading day...</Text>
        </Card>
      ) : (
        <>
          {/* Calorie Ring Card */}
          <Card variant="elevated" padding="lg" style={styles.ringCard}>
            <CalorieRing
              consumed={mealsData?.totals.calories || 0}
              target={targets.calories}
              size="lg"
              animated
            />
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
            />
          </Card>

          {/* Meals List */}
          {!meals.length ? (
            <Card variant="elevated" padding="lg" style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="restaurant-outline" size={40} color={theme.colors.ink[300]} />
              </View>
              <Text style={styles.emptyTitle}>No meals logged</Text>
              <Text style={styles.emptySubtitle}>Select a different date to view meal history</Text>
            </Card>
          ) : (
            <Card variant="elevated" padding="lg" style={styles.mealsCard}>
              <View style={styles.mealsHeader}>
                <Text style={styles.sectionTitle}>Meals</Text>
                <Ionicons name="restaurant-outline" size={20} color={theme.colors.ink[400]} />
              </View>
              <MealList meals={meals} onPress={onMealPress} />
            </Card>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.ink[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPressed: {
    backgroundColor: theme.colors.ink[100],
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
    backgroundColor: theme.colors.primary[50],
    marginBottom: 8,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary[600],
    letterSpacing: 0.2,
  },
  dateLabel: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabelText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: 0.2,
  },
  mealCount: {
    fontSize: 13,
    color: theme.colors.ink[500],
    marginTop: 2,
    fontWeight: '500',
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
    color: theme.colors.ink[900],
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
    color: theme.colors.ink[500],
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
    backgroundColor: theme.colors.ink[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[800],
    letterSpacing: 0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.ink[500],
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 20,
  },
});
