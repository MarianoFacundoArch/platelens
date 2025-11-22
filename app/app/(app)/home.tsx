import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Text, View, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroPieChart } from '@/components/MacroPieChart';
import { Card } from '@/components/Card';
import { StreakChip } from '@/components/StreakChip';
import { Logo } from '@/components/Logo';
import { MealDetailSheet } from '@/components/MealDetailSheet';
import { MealList } from '@/components/MealList';
import { MealEntryFAB } from '@/components/MealEntryFAB';
import { TextMealModal } from '@/components/TextMealModal';
import { theme } from '@/config/theme';
import { track } from '@/lib/analytics';
import { formatTimeAgo, formatLocalDateISO } from '@/lib/dateUtils';
import { useHaptics } from '@/hooks/useHaptics';
import { useDailyMeals } from '@/hooks/useDailyMeals';
import { useMealActions } from '@/hooks/useMealActions';
import { useUserTargets } from '@/hooks/useUserTargets';
import type { ScanResponse } from '@/lib/scan';
import { setCachedScan } from '@/lib/mmkv';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { medium, light } = useHaptics();
  const { targets } = useUserTargets();
  const [showTextMealModal, setShowTextMealModal] = useState(false);
  const [, setTicker] = useState(0); // Force re-render every second to update "X ago" text
  const [selectedMealId, setSelectedMealId] = useState<string | undefined>(undefined);

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

  // Temporary: Reset FAB position if it's stuck off-screen
  const handleResetFAB = async () => {
    try {
      await AsyncStorage.removeItem('platelens:fabPosition');
      Alert.alert(
        'FAB Reset',
        'The + button position has been reset. Pull down to refresh the screen.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to reset FAB:', error);
    }
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
      {/* Vibrant Gradient Background */}
      <LinearGradient
        colors={['#E0F7F4', '#F0FFFE', '#FFFFFF']}
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
            tintColor={theme.colors.primary[500]}
            title="Pull to refresh"
            titleColor={theme.colors.ink[400]}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.dateLabel}>TODAY</Text>
          <View style={styles.header}>
            <Logo variant="compact" />
            <View style={styles.headerRight}>
              {lastUpdated && (
                <Text style={styles.lastUpdated}>{formatTimeAgo(lastUpdated)}</Text>
              )}
              <StreakChip count={4} />
              {/* Temporary reset button - remove after FAB is fixed */}
              <Pressable onPress={handleResetFAB} style={styles.resetButton}>
                <Ionicons name="refresh-outline" size={18} color={theme.colors.primary[600]} />
              </Pressable>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
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
                <Ionicons name="restaurant-outline" size={20} color={theme.colors.ink[400]} />
              </View>

              {!mealData?.logs || mealData.logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="camera-outline" size={48} color={theme.colors.ink[300]} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastUpdated: {
    fontSize: 11,
    color: theme.colors.ink[400],
    fontWeight: '500',
  },
  resetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary[600],
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.ink[900],
    letterSpacing: -0.5,
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
    borderTopColor: theme.colors.ink[100],
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.ink[500],
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.ink[900],
  },
  statUnit: {
    fontSize: 14,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.ink[100],
    marginHorizontal: 20,
  },
  macrosCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
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
    color: theme.colors.ink[700],
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.ink[500],
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
