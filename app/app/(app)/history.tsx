import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/Card';
import { TabSelector, Tab } from '@/components/TabSelector';
import { DailyView } from '@/components/views/DailyView';
import { WeeklySummaryView } from '@/components/views/WeeklySummaryView';
import { MonthlyCalendarView } from '@/components/views/MonthlyCalendarView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { useDailyMeals } from '@/hooks/useDailyMeals';
import { useHistoryCache } from '@/hooks/useHistoryCache';
import { useUserTargets } from '@/hooks/useUserTargets';
import { getMealHistory } from '@/lib/api';

type HistoryDay = {
  dateISO: string;
  totals: { calories: number; p: number; c: number; f: number };
  logCount: number;
};

const TABS: Tab[] = [
  { id: 'daily', label: 'Daily', icon: 'calendar' },
  { id: 'weekly', label: 'Weekly', icon: 'stats-chart' },
  { id: 'monthly', label: 'Monthly', icon: 'grid' },
  { id: 'analytics', label: 'Analytics', icon: 'trending-up' },
];

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

const WEEK_START_DAY = 0; // 0 = Sunday; switch to 1 for Monday-start weeks if desired

function getWeekBounds(dateISO: string, weekStartsOn: number = WEEK_START_DAY) {
  const date = toDate(dateISO);
  const currentDay = date.getDay();
  const daysFromWeekStart = (currentDay - weekStartsOn + 7) % 7;
  const start = addDays(dateISO, -daysFromWeekStart);
  const end = addDays(start, 6);
  return { start, end };
}

export default function HistoryScreen() {
  const { light } = useHaptics();
  const historyCache = useHistoryCache();
  const { targets } = useUserTargets();
  const today = useMemo(() => todayISO(), []);
  const { start: todayWeekStart } = useMemo(() => getWeekBounds(today), [today]);
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekBounds(today).start);
  const currentWeekEnd = useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart]);
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
        const startDate = currentWeekStart;
        const endDate = currentWeekEnd; // 7 days total

        // Check cache first
        const cachedData = historyCache.get(startDate, endDate);
        if (cachedData && !options?.silent) {
          setHistory(cachedData);
          setIsHistoryLoading(false);
          // Still fetch fresh data in background
        }

        const response = await getMealHistory({ startDate, endDate });
        const days: HistoryDay[] = response?.days ?? [];

        // Update cache
        historyCache.set(startDate, endDate, days);

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
    [currentWeekEnd, currentWeekStart, historyCache],
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

  const maxCalories = weekDays.reduce(
    (max, day) => Math.max(max, day.totals.calories, targets.calories),
    targets.calories,
  );
  const averageCalories = weekDays.length
    ? Math.round(weekDays.reduce((acc, day) => acc + day.totals.calories, 0) / weekDays.length)
    : 0;

  const handleSelectDate = (dateISO: string) => {
    setSelectedDate(dateISO);
    light();
  };

  const isRefreshing = isHistoryRefreshing || isDayRefreshing;
  const handleRefresh = async () => {
    setIsHistoryRefreshing(true);
    await Promise.all([loadHistory({ silent: true }), refreshDay()]);
  };

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, -7));
    light();
  };

  const handleNextWeek = () => {
    const nextWeekStart = addDays(currentWeekStart, 7);
    // Don't go beyond today's week
    if (nextWeekStart <= todayWeekStart) {
      setCurrentWeekStart(nextWeekStart);
      light();
    }
  };

  const handleJumpToToday = () => {
    setCurrentWeekStart(todayWeekStart);
    setSelectedDate(today);
    light();
  };

  const handlePreviousDay = () => {
    setSelectedDate((prev) => addDays(prev, -1));
    light();
  };

  const handleNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    if (nextDay <= today) {
      setSelectedDate(nextDay);
      light();
    }
  };

  const isAtToday = useMemo(() => {
    return currentWeekStart === todayWeekStart;
  }, [currentWeekStart, todayWeekStart]);

  const isDayAtToday = selectedDate === today;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    light();
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
        </View>

        <TabSelector tabs={TABS} activeTabId={activeTab} onTabChange={handleTabChange} />

        {/* Render appropriate view based on active tab */}
        {activeTab === 'daily' && (
          <DailyView
            selectedDate={selectedDate}
            today={today}
            mealsData={mealsForDay}
            isDayLoading={isDayLoading}
            targets={targets}
            onPreviousDay={handlePreviousDay}
            onNextDay={handleNextDay}
            isAtToday={isDayAtToday}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklySummaryView
            weekDays={weekDays}
            targets={targets}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            isAtToday={isAtToday}
            weekRange={{ start: currentWeekStart, end: currentWeekEnd }}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyCalendarView
            currentDate={selectedDate}
            history={history}
            targets={targets}
            onDateSelect={handleSelectDate}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            currentDate={selectedDate}
            weekDays={weekDays}
            targets={targets}
          />
        )}

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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: 0.3,
  },
});
