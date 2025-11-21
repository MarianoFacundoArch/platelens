import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
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
import { useHaptics } from '@/hooks/useHaptics';
import { useDailyMeals } from '@/hooks/useDailyMeals';
import { useMealActions } from '@/hooks/useMealActions';
import { useUserTargets } from '@/hooks/useUserTargets';
import type { ScanResponse } from '@/lib/scan';
import { setCachedScan } from '@/lib/mmkv';

export default function HomeScreen() {
  const router = useRouter();
  const { medium, light } = useHaptics();
  const { data: mealData, isLoading, isRefreshing, refresh, reload } = useDailyMeals();
  const { targets } = useUserTargets();
  const [showTextMealModal, setShowTextMealModal] = useState(false);

  // Use meal actions hook for meal interactions
  const {
    selectedMeal,
    handleMealPress,
    handleDeleteMeal,
    handleUpdateMeal,
    closeDetailSheet,
  } = useMealActions(reload);

  const handleRefresh = () => {
    refresh();
  };

  const handleOpenCamera = () => {
    medium();
    track('camera_opened');
    router.push('/camera');
  };

  const handleOpenTextModal = () => {
    light();
    setShowTextMealModal(true);
  };

  const handleTextMealAnalyzed = (result: ScanResponse) => {
    // Cache the text scan result (without imageUri) so scan-result can read it
    const cachedScan = {
      dishTitle: result.dishTitle,
      ingredientsList: result.ingredientsList,
      totals: result.totals,
      confidence: result.confidence,
      timestamp: Date.now(),
      mealId: (result as any).mealId,
      scanId: (result as any).scanId,
      // No imageUri for text-based scans
    };
    setCachedScan('latest', JSON.stringify(cachedScan));

    // Navigate to scan-result screen
    router.push('/scan-result');
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

  return (
    <View style={styles.container}>
      {/* Vibrant Gradient Background */}
      <LinearGradient
        colors={['#E0F7F4', '#F0FFFE', '#FFFFFF']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

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
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.dateLabel}>TODAY</Text>
          <View style={styles.header}>
            <Logo variant="compact" />
            <View style={styles.headerRight}>
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
              <View style={styles.mealsHeader}>
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
      />

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
    padding: 20,
    paddingTop: 60,
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
