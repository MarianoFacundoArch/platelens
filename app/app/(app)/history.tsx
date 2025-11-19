import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { CalorieRing } from '@/components/CalorieRing';
import { MealList } from '@/components/MealList';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { useDailyMeals } from '@/hooks/useDailyMeals';
import { getMealHistory } from '@/lib/api';

type HistoryDay = {
  dateISO: string;
  totals: { calories: number; p: number; c: number; f: number };
  logCount: number;
};

const TARGET_CALORIES = 1950;
const TARGET_PROTEIN = 140;
const TARGET_CARBS = 200;
const TARGET_FAT = 65;

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function toDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`);
}

function addDays(dateISO: string, delta: number) {
  const date = toDate(dateISO);
  date.setDate(date.getDate() + delta);
  return date.toISOString().split('T')[0];
}

function formatWeekday(dateISO: string) {
  return toDate(dateISO).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDateLabel(dateISO: string, today: string) {
  if (dateISO === today) return 'Today';
  return toDate(dateISO).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
  const { light } = useHaptics();
  const today = useMemo(() => todayISO(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isHistoryRefreshing, setIsHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const {
    data: mealsForDay,
    isLoading: isDayLoading,
    isRefreshing: isDayRefreshing,
    refresh: refreshDay,
  } = useDailyMeals(selectedDate);

  const loadHistory = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsHistoryLoading(true);
      }
      setHistoryError(null);

      try {
        const endDate = today;
        const startDate = addDays(endDate, -6);
        const response = await getMealHistory({ startDate, endDate });
        const days: HistoryDay[] = response?.days ?? [];

        setHistory(days);
        setSelectedDate((current) => {
          if (days.length === 0) return current;
          return days.find((day) => day.dateISO === current)?.dateISO ?? days[days.length - 1].dateISO;
        });
      } catch (error) {
        console.warn('Failed to load meal history:', error);
        setHistoryError('Unable to load your week right now.');
      } finally {
        setIsHistoryLoading(false);
        setIsHistoryRefreshing(false);
      }
    },
    [today],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const weekDays = useMemo(
    () =>
      history.map((day) => {
        const weekday = formatWeekday(day.dateISO);
        const dateObj = toDate(day.dateISO);
        return {
          ...day,
          dayLabel: weekday,
          dateNumber: dateObj.getDate(),
          isToday: day.dateISO === today,
        };
      }),
    [history, today],
  );

  const selectedDaySummary = weekDays.find((day) => day.dateISO === selectedDate);
  const maxCalories = weekDays.reduce(
    (max, day) => Math.max(max, day.totals.calories, TARGET_CALORIES),
    TARGET_CALORIES,
  );
  const averageCalories = weekDays.length
    ? Math.round(weekDays.reduce((acc, day) => acc + day.totals.calories, 0) / weekDays.length)
    : 0;
  const meals = mealsForDay?.logs ?? [];

  const handleSelectDate = (dateISO: string) => {
    setSelectedDate(dateISO);
    light();
  };

  const isRefreshing = isHistoryRefreshing || isDayRefreshing;
  const handleRefresh = async () => {
    setIsHistoryRefreshing(true);
    await Promise.all([loadHistory({ silent: true }), refreshDay()]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F9FAFB', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Pressable onPress={() => light()}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.ink[700]} />
          </Pressable>
        </View>

        <Card variant="elevated" padding="md" style={styles.calendarCard}>
          {isHistoryLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary[500]} />
              <Text style={styles.loadingMuted}>Syncing your last week...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.weekStrip}>
                {weekDays.map((item) => {
                  const isSelected = item.dateISO === selectedDate;
                  return (
                    <Pressable
                      key={item.dateISO}
                      onPress={() => handleSelectDate(item.dateISO)}
                      style={[
                        styles.dayItem,
                        isSelected && styles.dayItemSelected,
                        item.isToday && styles.dayItemToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          isSelected && styles.dayLabelSelected,
                          item.isToday && styles.dayLabelToday,
                        ]}
                      >
                        {item.dayLabel}
                      </Text>
                      <Text
                        style={[
                          styles.dateNumber,
                          isSelected && styles.dateNumberSelected,
                          item.isToday && styles.dateNumberToday,
                        ]}
                      >
                        {item.dateNumber}
                      </Text>
                      {item.logCount > 0 && (
                        <View
                          style={[
                            styles.calorieDot,
                            (isSelected || item.isToday) && styles.calorieDotActive,
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
          {historyError ? <Text style={styles.errorText}>{historyError}</Text> : null}
        </Card>

        <Card variant="elevated" padding="lg" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.averageBadge}>
              <Text style={styles.averageText}>Avg. {averageCalories.toLocaleString()} kcal</Text>
            </View>
          </View>

          {isHistoryLoading ? (
            <View style={styles.placeholderChart}>
              <View style={styles.placeholderBar} />
              <View style={styles.placeholderBar} />
              <View style={styles.placeholderBar} />
              <View style={styles.placeholderBar} />
              <View style={styles.placeholderBar} />
              <View style={styles.placeholderBar} />
              <View style={styles.placeholderBar} />
            </View>
          ) : (
            <View style={styles.weekChart}>
              {weekDays.map((item) => {
                const percentage = maxCalories ? Math.min((item.totals.calories / maxCalories) * 100, 100) : 0;
                const isSelected = item.dateISO === selectedDate;
                return (
                  <View key={item.dateISO} style={styles.chartBar}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${percentage}%`,
                            backgroundColor: isSelected
                              ? theme.colors.primary[500]
                              : theme.colors.ink[200],
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.chartDayLabel,
                        isSelected && styles.chartDayLabelSelected,
                      ]}
                    >
                      {item.dayLabel[0]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <View style={styles.todaySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Meals for {formatDateLabel(selectedDate, today)}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {selectedDaySummary?.logCount ? `${selectedDaySummary.logCount} logged` : 'No meals logged yet'}
            </Text>
          </View>

          <Card variant="elevated" padding="lg" style={styles.dayOverviewCard}>
            <View style={styles.overviewHeader}>
              <View>
                <Text style={styles.overviewLabel}>Calories</Text>
                <Text style={styles.overviewValue}>
                  {(mealsForDay?.totals.calories ?? 0).toLocaleString()} kcal
                </Text>
                <Text style={styles.overviewHint}>Target {TARGET_CALORIES.toLocaleString()} kcal</Text>
              </View>
              <CalorieRing
                consumed={mealsForDay?.totals.calories || 0}
                target={TARGET_CALORIES}
                size="md"
                animated
              />
            </View>

            <View style={styles.macroSummary}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{mealsForDay?.totals.p || 0}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroTarget}>/{TARGET_PROTEIN}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{mealsForDay?.totals.c || 0}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroTarget}>/{TARGET_CARBS}g</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{mealsForDay?.totals.f || 0}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroTarget}>/{TARGET_FAT}g</Text>
              </View>
            </View>
          </Card>

          {isDayLoading ? (
            <Card variant="elevated" padding="md" style={styles.loadingCard}>
              <ActivityIndicator color={theme.colors.primary[500]} />
              <Text style={styles.loadingMuted}>Pulling your meals...</Text>
            </Card>
          ) : !meals.length ? (
            <Card variant="elevated" padding="lg" style={styles.emptyCard}>
              <Ionicons name="fast-food-outline" size={32} color={theme.colors.ink[300]} />
              <Text style={styles.emptyTitle}>Nothing logged for this day</Text>
              <Text style={styles.emptySubtitle}>Pick another date above to browse.</Text>
            </Card>
          ) : (
            <MealList meals={meals} />
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: -0.5,
  },
  calendarCard: {
    marginBottom: 16,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 64,
    borderWidth: 1,
    borderColor: theme.colors.ink[100],
    backgroundColor: '#FFFFFF',
  },
  dayItemSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  dayItemToday: {
    borderColor: theme.colors.primary[200],
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink[500],
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  dayLabelToday: {
    color: theme.colors.primary[600],
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  dateNumberSelected: {
    color: '#FFFFFF',
  },
  dateNumberToday: {
    color: theme.colors.primary[700],
  },
  calorieDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.ink[200],
    marginTop: 6,
  },
  calorieDotActive: {
    backgroundColor: '#FFFFFF',
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.ink[500],
    marginTop: 4,
  },
  averageBadge: {
    backgroundColor: theme.colors.ink[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  averageText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink[700],
  },
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 120,
    marginTop: 12,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    width: 32,
    backgroundColor: theme.colors.ink[50],
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  chartDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink[500],
  },
  chartDayLabelSelected: {
    color: theme.colors.primary[600],
  },
  todaySection: {
    gap: 16,
  },
  dayOverviewCard: {
    marginBottom: 8,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.ink[500],
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  overviewValue: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  overviewHint: {
    fontSize: 12,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  macroSummary: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
    gap: 24,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  macroLabel: {
    fontSize: 11,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  macroTarget: {
    fontSize: 11,
    color: theme.colors.ink[400],
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  loadingCard: {
    gap: 10,
    alignItems: 'center',
  },
  loadingMuted: {
    fontSize: 13,
    color: theme.colors.ink[500],
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink[800],
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.ink[500],
  },
  placeholderChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  placeholderBar: {
    flex: 1,
    height: 80,
    backgroundColor: theme.colors.ink[50],
    borderRadius: 12,
  },
  errorText: {
    color: theme.colors.primary[600],
    marginTop: 8,
    fontSize: 12,
  },
});
