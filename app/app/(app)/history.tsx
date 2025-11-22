import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { Card } from '@/components/Card';
import { TabSelector, Tab } from '@/components/TabSelector';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DailyView } from '@/components/views/DailyView';
import { WeeklySummaryView } from '@/components/views/WeeklySummaryView';
import { MonthlyCalendarView } from '@/components/views/MonthlyCalendarView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { MealDetailSheet } from '@/components/MealDetailSheet';
import { MealEntryFAB } from '@/components/MealEntryFAB';
import { TextMealModal } from '@/components/TextMealModal';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useDailyMeals } from '@/hooks/useDailyMeals';
import { useHistoryCache } from '@/hooks/useHistoryCache';
import { useUserTargets } from '@/hooks/useUserTargets';
import { useMealActions } from '@/hooks/useMealActions';
import { getMealHistory } from '@/lib/api';
import { formatLocalDateISO, formatTimeAgo } from '@/lib/dateUtils';
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
  return formatLocalDateISO(new Date());
}

function toDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`);
}

function addDays(dateISO: string, delta: number) {
  const date = toDate(dateISO);
  date.setDate(date.getDate() + delta);
  return formatLocalDateISO(date);
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
  const { colors } = useTheme();
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
  const [selectedMealId, setSelectedMealId] = useState<string | undefined>(undefined);
  const [, setTicker] = useState(0); // Force re-render every second to update "X ago" text
  const hasFocusedRef = useRef(false);

  // Pass selected meal ID to enable polling for ingredient images
  const {
    data: mealsForDay,
    isLoading: isDayLoading,
    isRefreshing: isDayRefreshing,
    lastUpdated: dayLastUpdated,
    refresh: refreshDay,
    reload: reloadDay,
  } = useDailyMeals(selectedDate, selectedMealId);

  // Use meal actions hook for meal interactions
  const {
    selectedMeal,
    handleMealPress: originalHandleMealPress,
    handleDeleteMeal,
    handleUpdateMeal,
    closeDetailSheet: originalCloseDetailSheet,
  } = useMealActions(reloadDay);

  // Wrap handlers to track selected meal ID for polling
  const handleMealPress = (meal: any, index: number) => {
    setSelectedMealId(meal.id);
    originalHandleMealPress(meal, index);
  };

  const closeDetailSheet = () => {
    setSelectedMealId(undefined);
    originalCloseDetailSheet();
  };

  // Get the live meal data (not stale snapshot) for the detail sheet
  // This ensures ingredient images update when polling fetches new data
  const liveMeal = selectedMeal && selectedMealId && mealsForDay?.logs
    ? mealsForDay.logs.find(log => log.id === selectedMealId) || selectedMeal.meal
    : selectedMeal?.meal || null;

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
    router.push({ pathname: '/camera', params: { dateISO: selectedDate, source: 'history' } });
  };

  const handleOpenTextModal = () => {
    light();
    setShowTextMealModal(true);
  };

  const handleTextMealAnalyzed = (result: ScanResponse) => {
    // Meal has been queued and is now processing
    // Refresh the day's meals to show the new processing meal
    refreshDay();
  };

  // Reload data when screen comes into focus (e.g., navigating back from home)
  useFocusEffect(
    useCallback(() => {
      // Skip reload on first focus (mount) since data is already loaded by useEffect
      if (hasFocusedRef.current) {
        reloadDay({ silent: true });
      } else {
        hasFocusedRef.current = true;
      }
    }, [reloadDay])
  );

  // Update timestamp display every second
  useEffect(() => {
    if (!dayLastUpdated) return;

    const interval = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [dayLastUpdated]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.middle, colors.gradient.end]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
        contentInset={{ top: 60 }}
        contentOffset={{ x: 0, y: -60 }}
        automaticallyAdjustContentInsets={false}
        bounces={!isRefreshing}
        alwaysBounceVertical={true}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            title="Pull to refresh"
            titleColor={colors.text.tertiary}
          />
        }
      >
        <ScreenHeader title="History" />

        <TabSelector tabs={TABS} activeTabId={activeTab} onTabChange={handleTabChange} />

        {/* Render appropriate view based on active tab */}
        {activeTab === 'daily' && (
          <DailyView
            selectedDate={selectedDate}
            today={today}
            mealsData={mealsForDay}
            isDayLoading={isDayLoading}
            lastUpdated={dayLastUpdated}
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
        meal={liveMeal}
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
});
