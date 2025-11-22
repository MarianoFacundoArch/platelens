import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useMemo } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View, Easing } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { MealLog } from '@/hooks/useDailyMeals';
import SwipeableMealCard, { SwipeableMealCardRef } from './SwipeableMealCard';

export const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '☀️',
  brunch: '🥐',
  lunch: '🌞',
  snack: '🍎',
  dinner: '🌙',
  'pre-workout': '💪',
  'post-workout': '🏋️',
};

type AnimatedCardProps = {
  children: React.ReactNode;
  delay: number;
};

function formatTime(isoString: string | undefined) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
}

function formatNumber(value: number) {
  return value.toFixed(1);
}

function PulsingPlaceholder() {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.pendingImagePlaceholder, { opacity: pulseAnim }]}>
      <Ionicons name="hourglass-outline" size={24} color={colors.primary[400]} />
    </Animated.View>
  );
}

function AnimatedMealCard({ children, delay }: AnimatedCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        marginBottom: 12,
      }}
    >
      {children}
    </Animated.View>
  );
}

type MealListProps = {
  meals: MealLog[];
  onPress?: (meal: MealLog, index: number) => void;
  onEdit?: (meal: MealLog, index: number) => void;
  onDelete?: (mealId: string) => void;
};

export function MealList({ meals, onPress, onEdit, onDelete }: MealListProps) {
  const { colors } = useTheme();
  const swipeRefs = useRef<(SwipeableMealCardRef | null)[]>([]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!meals || meals.length === 0) {
    return null;
  }

  // Close all other swipeable cards when one opens
  const closeOtherCards = (currentIndex: number) => {
    swipeRefs.current.forEach((ref, index) => {
      if (ref && index !== currentIndex) {
        ref.close();
      }
    });
  };

  return (
    <View style={styles.mealsList}>
      {meals.map((log, index) => {
        const emoji = log.mealType ? MEAL_TYPE_EMOJI[log.mealType] : '🍽️';
        const mealTypeText = log.mealType ? capitalize(log.mealType) : '';
        const isPending = log.status === 'pending_scan';
        const mealLabel = isPending
          ? 'Analyzing meal...'
          : log.dishTitle || mealTypeText || `Meal ${index + 1}`;
        const timeLabel = formatTime(log.createdAt);
        const ingredients = log.ingredientsList || log.items || [];
        const subtitle = isPending
          ? 'Your meal is being processed. This usually takes a few seconds.'
          : log.dishTitle
            ? (log.mealType ? `${emoji} ${mealTypeText}` : timeLabel)
            : ingredients.map((ingredient) => ingredient.name).join(', ');

        return (
          <AnimatedMealCard key={log.id} delay={index * 100}>
            <SwipeableMealCard
              ref={(ref) => (swipeRefs.current[index] = ref)}
              mealTitle={mealLabel}
              isPending={isPending}
              onPress={() => {
                closeOtherCards(index);
                onPress?.(log, index);
              }}
              onEdit={() => {
                closeOtherCards(index);
                onEdit?.(log, index);
              }}
              onDelete={() => {
                closeOtherCards(index);
                onDelete?.(log.id);
              }}
            >
              {/* Show status badge for pending, time badge for normal meals */}
              {isPending ? (
                <View style={styles.statusBadge}>
                  <Ionicons name="time" size={12} color={colors.primary[700]} />
                  <Text style={styles.statusBadgeText}>Processing</Text>
                </View>
              ) : timeLabel ? (
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{timeLabel}</Text>
                </View>
              ) : null}

              {isPending && (log.imageUrl || log.imageUri) ? (
                <View style={styles.pendingImageContainer}>
                  <Image
                    source={{ uri: log.imageUrl || log.imageUri }}
                    style={[styles.mealImage, styles.pendingImage]}
                    resizeMode="cover"
                  />
                  <View style={styles.spinnerOverlay}>
                    <ActivityIndicator size="small" color={colors.primary[600]} />
                  </View>
                </View>
              ) : isPending ? (
                <PulsingPlaceholder />
              ) : log.imageUrl || log.imageUri ? (
                <Image
                  source={{ uri: log.imageUrl || log.imageUri }}
                  style={styles.mealImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.mealIcon}>
                  <Ionicons name="restaurant" size={20} color={colors.primary[500]} />
                </View>
              )}

              <View style={styles.mealInfo}>
                <Text style={[styles.mealName, isPending && styles.pendingMealName]}>
                  {!isPending && !log.dishTitle && log.mealType && <Text>{emoji} </Text>}
                  {mealLabel}
                </Text>
                {!!subtitle && (
                  <Text style={[styles.mealItems, isPending && styles.pendingSubtitle]} numberOfLines={isPending ? 2 : 1}>
                    {subtitle}
                  </Text>
                )}
                {!isPending && (
                  <View style={styles.mealCalories}>
                    <Text style={styles.mealCalorieValue}>{formatNumber(log.totalCalories)}</Text>
                    <Text style={styles.mealCalorieUnit}>kcal</Text>
                  </View>
                )}
              </View>
            </SwipeableMealCard>
          </AnimatedMealCard>
        );
      })}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    mealsList: {
      gap: 12,
    },
    timeBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: colors.primary[50],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    timeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary[600],
      letterSpacing: 0.3,
    },
    mealIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary[100],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    mealImage: {
      width: 56,
      height: 56,
      borderRadius: 12,
      marginRight: 14,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    mealEmoji: {
      fontSize: 22,
    },
    mealInfo: {
      flex: 1,
      paddingRight: 60,
    },
    mealName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 6,
    },
    mealItems: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    mealCalories: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    pendingText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary[600],
    },
    mealCalorieValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary[600],
    },
    mealCalorieUnit: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.tertiary,
    },
    statusBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary[50],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary[700],
      letterSpacing: 0.3,
    },
    pendingImagePlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 12,
      marginRight: 14,
      backgroundColor: colors.primary[50],
      borderWidth: 1,
      borderColor: colors.primary[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingMealName: {
      color: colors.primary[700],
      fontStyle: 'italic',
    },
    pendingSubtitle: {
      fontSize: 12,
      color: colors.text.tertiary,
      fontStyle: 'italic',
    },
    pendingImageContainer: {
      width: 56,
      height: 56,
      borderRadius: 12,
      marginRight: 14,
      position: 'relative',
    },
    pendingImage: {
      opacity: 0.5,
    },
    spinnerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
