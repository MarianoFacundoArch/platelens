import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroPieChart } from '@/components/MacroPieChart';
import { theme } from '@/config/theme';
import { UserTargets } from '@/hooks/useUserTargets';

type HistoryDay = {
  dateISO: string;
  totals: { calories: number; p: number; c: number; f: number };
  logCount: number;
};

type WeekRange = {
  start: string;
  end: string;
};

type WeeklySummaryViewProps = {
  weekDays: Array<HistoryDay & { dayLabel: string; dateNumber: number; isToday: boolean; isFuture: boolean }>;
  targets: UserTargets;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  isAtToday: boolean;
  weekRange: WeekRange;
  onSelectDay: (dateISO: string) => void;
  onJumpToToday: () => void;
};

function calculateAverage(weekDays: HistoryDay[], key: keyof HistoryDay['totals']) {
  if (weekDays.length === 0) return 0;
  return Math.round(weekDays.reduce((acc, day) => acc + day.totals[key], 0) / weekDays.length);
}

function formatWeekRange(range: WeekRange) {
  if (!range.start || !range.end) return 'Week';

  const startDate = new Date(`${range.start}T00:00:00`);
  const endDate = new Date(`${range.end}T00:00:00`);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  };

  const startLabel = startDate.toLocaleDateString('en-US', options);
  const endLabel = endDate.toLocaleDateString('en-US', options);

  return `${startLabel} - ${endLabel}`;
}

function getWeekLabel(range: WeekRange, isCurrentWeek: boolean) {
  const rangeLabel = formatWeekRange(range);
  if (isCurrentWeek) return `This Week (${rangeLabel})`;
  return rangeLabel;
}

export function WeeklySummaryView({
  weekDays,
  targets,
  onPreviousWeek,
  onNextWeek,
  isAtToday,
  weekRange,
  onSelectDay,
  onJumpToToday,
}: WeeklySummaryViewProps) {
  const avgCalories = calculateAverage(weekDays, 'calories');
  const avgProtein = calculateAverage(weekDays, 'p');
  const avgCarbs = calculateAverage(weekDays, 'c');
  const avgFat = calculateAverage(weekDays, 'f');

  const maxCalories = Math.max(...weekDays.map(d => d.totals.calories), targets.calories);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <Pressable onPress={onPreviousWeek} style={styles.navButton}>
          {({ pressed }) => (
            <View style={[styles.navButtonInner, pressed && styles.navButtonPressed]}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.ink[700]} />
            </View>
          )}
        </Pressable>

        <View style={styles.weekLabel}>
          <Text style={styles.weekLabelText}>{getWeekLabel(weekRange, isAtToday)}</Text>
        </View>

        <Pressable
          onPress={onNextWeek}
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

      {/* Weekly Average Calorie Ring */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Average</Text>
        <CalorieRing
          consumed={avgCalories}
          target={targets.calories}
          size="lg"
          animated
        />
      </Card>

      {/* Bar Chart - Daily Calories */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Daily Calories</Text>

        <View style={styles.barChart}>
          {weekDays.map((day) => {
            const percentage = maxCalories ? Math.min((day.totals.calories / maxCalories) * 100, 100) : 0;
            const isOnTarget = Math.abs(day.totals.calories - targets.calories) <= targets.calories * 0.1;
            const isFuture = day.isFuture;
            const barColor = isFuture
              ? theme.colors.ink[200]
              : day.isToday
              ? theme.colors.primary[600]
              : isOnTarget
              ? theme.colors.primary[500]
              : theme.colors.ink[300];

            return (
              <Pressable key={day.dateISO} style={styles.barColumn} onPress={() => onSelectDay(day.dateISO)}>
                <View style={styles.barValue}>
                  {day.totals.calories > 0 && (
                    <Text style={styles.barValueText}>
                      {Math.round(day.totals.calories / 100) / 10}k
                    </Text>
                  )}
                </View>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${percentage}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    isFuture && styles.futureLabel,
                    day.isToday && styles.todayLabel,
                  ]}
                >
                  {day.dayLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Target Line Reference */}
        <View style={styles.targetReference}>
          <View style={styles.targetDot} />
          <Text style={styles.targetText}>Target: {targets.calories.toLocaleString()} kcal</Text>
        </View>
      </Card>

      {/* Macro Pie Chart */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Macronutrients</Text>
        <MacroPieChart
          current={{
            protein: avgProtein,
            carbs: avgCarbs,
            fat: avgFat,
          }}
          target={{
            protein: targets.protein,
            carbs: targets.carbs,
            fat: targets.fat,
          }}
        />
      </Card>

      {/* Quick Stats */}
      <Card variant="elevated" padding="lg" style={styles.card}>
        <Text style={styles.cardTitle}>Week Summary</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="flame" size={24} color={theme.colors.primary[600]} />
            <Text style={styles.statValue}>{avgCalories.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Avg Calories</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="restaurant" size={24} color={theme.colors.protein.main} />
            <Text style={styles.statValue}>{avgProtein}g</Text>
            <Text style={styles.statLabel}>Avg Protein</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="nutrition" size={24} color={theme.colors.carbs.main} />
            <Text style={styles.statValue}>{avgCarbs}g</Text>
            <Text style={styles.statLabel}>Avg Carbs</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="water" size={24} color={theme.colors.fat.main} />
            <Text style={styles.statValue}>{avgFat}g</Text>
            <Text style={styles.statLabel}>Avg Fat</Text>
          </View>
        </View>
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
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
  weekLabel: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabelText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: 0.2,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    gap: 8,
    marginTop: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barValue: {
    height: 20,
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.ink[600],
  },
  barContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.ink[50],
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    minHeight: 100,
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayLabel: {
    color: theme.colors.primary[600],
  },
  futureLabel: {
    color: theme.colors.ink[300],
  },
  targetReference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
  },
  targetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary[500],
  },
  targetText: {
    fontSize: 13,
    color: theme.colors.ink[600],
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.ink[50],
    borderRadius: 14,
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.ink[600],
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
