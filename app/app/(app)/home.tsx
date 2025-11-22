import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Text, View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroPieChart } from '@/components/MacroPieChart';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { MealDetailSheet } from '@/components/MealDetailSheet';
import { MealList } from '@/components/MealList';
import { MealEntryFAB } from '@/components/MealEntryFAB';
import { TextMealModal } from '@/components/TextMealModal';
import { useTheme } from '@/hooks/useTheme';
import { track } from '@/lib/analytics';
import { formatLocalDateISO, formatTimeAgo } from '@/lib/dateUtils';
import { useHaptics } from '@/hooks/useHaptics';
import { useDailyMeals } from '@/hooks/useDailyMeals';
import { useMealActions } from '@/hooks/useMealActions';
import { useUserTargets } from '@/hooks/useUserTargets';
import type { ScanResponse } from '@/lib/scan';
import { setCachedScan } from '@/lib/mmkv';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { medium, light } = useHaptics();
  const { targets } = useUserTargets();
  const [showTextMealModal, setShowTextMealModal] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | undefined>(undefined);
  const [, setTicker] = useState(0); // Force re-render every second to update "X ago" text

  // Dynamic styles based on theme
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get today's date in local timezone
  const todayDateISO = formatLocalDateISO();

  const scrollViewRef = useRef<ScrollView>(null);
  const mealsCardRef = useRef<View>(null);
  const hasFocusedRef = useRef(false);

  // Pass selected meal ID to enable polling for ingredient images
  const { data: mealData, isLoading, isRefreshing, lastUpdated, refresh, reload } = useDailyMeals(
    todayDateISO,
    selectedMealId
  );

  // Use meal actions hook for meal interactions
  const {
    selectedMeal,
    handleMealPress: originalHandleMealPress,
    handleDeleteMeal,
    handleUpdateMeal,
    closeDetailSheet: originalCloseDetailSheet,
  } = useMealActions(reload);

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
  const liveMeal = selectedMeal && selectedMealId && mealData?.logs
    ? mealData.logs.find(log => log.id === selectedMealId) || selectedMeal.meal
    : selectedMeal?.meal || null;

  const handleRefresh = () => {
    refresh();
  };

  const handleOpenCamera = () => {
    medium();
    track('camera_opened');
    router.push({ pathname: '/camera', params: { dateISO: todayDateISO } });
  };

  const handleOpenTextModal = () => {
    light();
    setShowTextMealModal(true);
  };

  const scrollToMeals = () => {
    // Wait a bit for the content to render, then scroll
    setTimeout(() => {
      mealsCardRef.current?.measureLayout(
        scrollViewRef.current as any,
        (_left, top) => {
          scrollViewRef.current?.scrollTo({ y: top - 20, animated: true });
        },
        () => {
          // Fallback if measureLayout fails - just scroll to a reasonable position
          scrollViewRef.current?.scrollTo({ y: 400, animated: true });
        }
      );
    }, 300);
  };

  const handleTextMealAnalyzed = (result: ScanResponse) => {
    // Meal has been queued and is now processing
    // Refresh the meals list to show the new processing meal
    refresh();

    // Scroll to meals section to show the processing meal
    scrollToMeals();
  };

  // Update timestamp display every second
  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Scroll to meals when returning from camera with scrollToMeals param
  useEffect(() => {
    if (params.scrollToMeals === 'true' && !isLoading && mealData) {
      scrollToMeals();
      // Clear the param to avoid scrolling again
      router.setParams({ scrollToMeals: undefined });
    }
  }, [params.scrollToMeals, isLoading, mealData]);

  // Reload meals when screen comes into focus (e.g., navigating back from history)
  useFocusEffect(
    useCallback(() => {
      // Skip reload on first focus (mount) since data is already loaded by useEffect
      if (hasFocusedRef.current) {
        reload({ silent: true });
      } else {
        hasFocusedRef.current = true;
      }
    }, [reload])
  );

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.middle, colors.gradient.end]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollViewRef}
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
        {/* Header */}
        <ScreenHeader title="Home" />

        {/* Last Updated Timestamp */}
        {lastUpdated && (
          <Text style={styles.lastUpdated}>Updated {formatTimeAgo(lastUpdated)}</Text>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : (
          <>
            {/* Calorie Ring Card */}
            <Card variant="elevated" padding="lg" style={styles.ringCard}>
              <CalorieRing
                consumed={mealData?.totals.calories || 0}
                target={targets.calories}
                size="lg"
                animated
              />

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>REMAINING</Text>
                  <Text style={styles.statValue}>
                    {Math.max(0, targets.calories - (mealData?.totals.calories || 0)).toLocaleString()}
                  </Text>
                  <Text style={styles.statUnit}>kcal</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>BURNED</Text>
                  <Text style={styles.statValue}>2,450</Text>
                  <Text style={styles.statUnit}>kcal</Text>
                </View>
              </View>
            </Card>

            {/* Macros Card */}
            <Card variant="elevated" padding="lg" style={styles.macrosCard}>
              <Text style={styles.sectionTitle}>Macronutrients</Text>
              <MacroPieChart
                current={{
                  protein: mealData?.totals.p || 0,
                  carbs: mealData?.totals.c || 0,
                  fat: mealData?.totals.f || 0,
                }}
                target={{
                  protein: targets.protein,
                  carbs: targets.carbs,
                  fat: targets.fat,
                }}
              />
            </Card>

            {/* Today's Meals */}
            <Card variant="elevated" padding="lg" style={styles.mealsCard}>
              <View ref={mealsCardRef} style={styles.mealsHeader}>
                <Text style={styles.sectionTitle}>Today's Meals</Text>
                <Ionicons name="restaurant-outline" size={20} color={colors.text.tertiary} />
              </View>

              {!mealData?.logs || mealData.logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="camera-outline" size={48} color={colors.ink[300]} />
                  <Text style={styles.emptyTitle}>No meals logged yet</Text>
                  <Text style={styles.emptySubtitle}>Tap the camera button to get started</Text>
                </View>
              ) : (
                <MealList
                  meals={mealData.logs}
                  onPress={handleMealPress}
                  onEdit={handleMealPress}
                  onDelete={handleDeleteMeal}
                />
              )}
            </Card>
          </>
        )}

        {/* Spacing for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button with Camera and Text options */}
      <MealEntryFAB
        onCameraPress={handleOpenCamera}
        onTextPress={handleOpenTextModal}
      />

      {/* Text Meal Entry Modal */}
      <TextMealModal
        visible={showTextMealModal}
        onClose={() => setShowTextMealModal(false)}
        onAnalyzed={handleTextMealAnalyzed}
        dateISO={todayDateISO}
      />

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

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    lastUpdated: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontWeight: '500',
      textAlign: 'right',
      marginBottom: 16,
    },
    ringCard: {
      marginBottom: 16,
      alignItems: 'center',
    },
    quickStats: {
      flexDirection: 'row',
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      width: '100%',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text.secondary,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text.primary,
    },
    statUnit: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: 2,
    },
    divider: {
      width: 1,
      height: '100%',
      backgroundColor: colors.border.subtle,
      marginHorizontal: 20,
    },
    macrosCard: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    macrosContainer: {
      gap: 20,
    },
    mealsCard: {
      marginBottom: 16,
    },
    mealsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: 4,
    },
    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
