import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { TabSelector, Tab } from '@/components/TabSelector';
import { DailyView } from '@/components/views/DailyView';
import { WeeklySummaryView } from '@/components/views/WeeklySummaryView';
import { MonthlyCalendarView } from '@/components/views/MonthlyCalendarView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { MealDetailSheet } from '@/components/MealDetailSheet';
import { MealEntryFAB } from '@/components/MealEntryFAB';
import { TextMealModal } from '@/components/TextMealModal';
import { theme } from '@/config/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { useDailyMeals } from '@/hooks/useDailyMeals';
import { useHistoryCache } from '@/hooks/useHistoryCache';
import { useUserTargets } from '@/hooks/useUserTargets';
import { useMealActions } from '@/hooks/useMealActions';
import { getMealHistory } from '@/lib/api';
import type { ScanResponse } from '@/lib/scan';
import { track } from '@/lib/analytics';

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
  const router = useRouter();
  const { light, medium } = useHaptics();
  const { get: getHistoryCache, set: setHistoryCache } = useHistoryCache();
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
  const [showTextMealModal, setShowTextMealModal] = useState(false);

  const {
    data: mealsForDay,
    isLoading: isDayLoading,
    isRefreshing: isDayRefreshing,
    refresh: refreshDay,
    reload: reloadDay,
  } = useDailyMeals(selectedDate);

  // Use meal actions hook for meal interactions
  const {
    selectedMeal,
    handleMealPress,
    handleDeleteMeal,
    handleUpdateMeal,
    closeDetailSheet,
  } = useMealActions(reloadDay);

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
        const cachedData = getHistoryCache(startDate, endDate);
        if (cachedData && !options?.silent) {
          setHistory(cachedData);
          setIsHistoryLoading(false);
          // Still fetch fresh data in background
        }

        const response = await getMealHistory({ startDate, endDate });
        const days: HistoryDay[] = response?.days ?? [];

        // Update cache
        setHistoryCache(startDate, endDate, days);

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
    [currentWeekEnd, currentWeekStart, getHistoryCache, setHistoryCache],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const weekDays = useMemo(
    () =>
      history.map((day) => {
        const weekday = formatWeekday(day.dateISO);
        const dateObj = toDate(day.dateISO);
        const isFuture = day.dateISO > today;
        return {
          ...day,
          dayLabel: weekday,
          dateNumber: dateObj.getDate(),
          isToday: day.dateISO === today,
          isFuture,
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

  const handleOpenCamera = () => {
    medium();
    track('camera_opened_from_history');
    router.push({ pathname: '/camera', params: { dateISO: selectedDate } });
  };

  const handleOpenTextModal = () => {
    light();
    setShowTextMealModal(true);
  };

  const handleTextMealAnalyzed = (result: ScanResponse) => {
    // Navigate to scan-result screen with the text scan result
    router.push({
      pathname: '/scan-result',
      params: {
        dishTitle: result.dishTitle,
        totals: JSON.stringify(result.totals),
        ingredientsList: JSON.stringify(result.ingredientsList),
        confidence: result.confidence.toString(),
        scanId: (result as any).scanId || '',
        mealId: (result as any).mealId || '',
        source: 'text',
      },
    });
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
            onJumpToToday={handleJumpToToday}
            onMealPress={handleMealPress}
            onMealEdit={handleMealPress}
            onMealDelete={handleDeleteMeal}
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
            onSelectDay={(dateISO) => {
              setSelectedDate(dateISO);
              setActiveTab('daily');
              light();
            }}
            onJumpToToday={handleJumpToToday}
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button for adding meals - only in Daily tab */}
      {activeTab === 'daily' && (
        <>
          <MealEntryFAB
            onCameraPress={handleOpenCamera}
            onTextPress={handleOpenTextModal}
          />

          {/* Text Meal Entry Modal */}
          <TextMealModal
            visible={showTextMealModal}
            onClose={() => setShowTextMealModal(false)}
            onAnalyzed={handleTextMealAnalyzed}
            dateISO={selectedDate}
          />
        </>
      )}

      {/* Meal Detail Sheet */}
      <MealDetailSheet
        visible={!!selectedMeal}
        meal={selectedMeal?.meal || null}
        mealIndex={selectedMeal?.index || 0}
        onClose={closeDetailSheet}
        onDelete={handleDeleteMeal}
        onUpdate={handleUpdateMeal}
      />
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
