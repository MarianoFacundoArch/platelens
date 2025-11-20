import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/config/theme';
import { MealLog } from '@/hooks/useDailyMeals';

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
  onPress: () => void;
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

function AnimatedMealCard({ children, delay, onPress }: AnimatedCardProps) {
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
      }}
    >
      <Pressable onPress={onPress} style={styles.mealItem}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

type MealListProps = {
  meals: MealLog[];
  onPress?: (meal: MealLog, index: number) => void;
};

export function MealList({ meals, onPress }: MealListProps) {
  if (!meals || meals.length === 0) {
    return null;
  }

  return (
    <View style={styles.mealsList}>
      {meals.map((log, index) => {
        const emoji = log.mealType ? MEAL_TYPE_EMOJI[log.mealType] : '🍽️';
        const mealTypeText = log.mealType ? capitalize(log.mealType) : '';
        const mealLabel = log.dishTitle || mealTypeText || `Meal ${index + 1}`;
        const timeLabel = formatTime(log.createdAt);
        const ingredients = log.ingredientsList || log.items || [];
        const subtitle = log.dishTitle
          ? (log.mealType ? `${emoji} ${mealTypeText}` : timeLabel)
          : ingredients.map((ingredient) => ingredient.name).join(', ');

        return (
          <AnimatedMealCard
            key={log.id}
            delay={index * 100}
            onPress={() => onPress?.(log, index)}
          >
            {timeLabel ? (
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{timeLabel}</Text>
              </View>
            ) : null}

            {log.imageUri ? (
              <Image
                source={{ uri: log.imageUri }}
                style={styles.mealImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mealIcon}>
                <Ionicons name="restaurant" size={20} color={theme.colors.primary[500]} />
              </View>
            )}

            <View style={styles.mealInfo}>
              <Text style={styles.mealName}>
                {!log.dishTitle && log.mealType && <Text>{emoji} </Text>}
                {mealLabel}
              </Text>
              {!!subtitle && (
                <Text style={styles.mealItems} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
              <View style={styles.mealCalories}>
                <Text style={styles.mealCalorieValue}>{formatNumber(log.totalCalories)}</Text>
                <Text style={styles.mealCalorieUnit}>kcal</Text>
              </View>
            </View>
          </AnimatedMealCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mealsList: {
    gap: 12,
  },
  mealItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.ink[100],
  },
  timeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary[600],
    letterSpacing: 0.3,
  },
  mealIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[100],
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
    borderColor: theme.colors.ink[100],
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
    color: theme.colors.ink[900],
    marginBottom: 6,
  },
  mealItems: {
    fontSize: 13,
    color: theme.colors.ink[500],
    marginBottom: 8,
    lineHeight: 18,
  },
  mealCalories: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  mealCalorieValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  mealCalorieUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink[400],
  },
});
