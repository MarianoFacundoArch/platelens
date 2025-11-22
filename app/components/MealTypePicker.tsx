import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useMemo } from 'react';

export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'snack' | 'dinner' | 'pre-workout' | 'post-workout';

const MEAL_TYPES: Array<{ value: MealType; label: string; emoji: string }> = [
  { value: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { value: 'brunch', label: 'Brunch', emoji: '🥐' },
  { value: 'lunch', label: 'Lunch', emoji: '🌞' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
  { value: 'dinner', label: 'Dinner', emoji: '🌙' },
  { value: 'pre-workout', label: 'Pre-workout', emoji: '💪' },
  { value: 'post-workout', label: 'Post-workout', emoji: '🏋️' },
];

interface MealTypePickerProps {
  selected: MealType | undefined;
  onSelect: (mealType: MealType) => void;
}

export function MealTypePicker({ selected, onSelect }: MealTypePickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { selection } = useHaptics();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Meal Type</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsContainer}
      >
        {MEAL_TYPES.map((type) => {
          const isSelected = selected === type.value;
          return (
            <Pressable
              key={type.value}
              onPress={() => {
                selection();
                onSelect(type.value);
              }}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
            >
              <Text style={styles.optionEmoji}>{type.emoji}</Text>
              <Text style={[
                styles.optionLabel,
                isSelected && styles.optionLabelSelected,
              ]}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    optionsContainer: {
      gap: 8,
      paddingHorizontal: 2,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.background.subtle,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      gap: 6,
    },
    optionSelected: {
      backgroundColor: colors.primary[50],
      borderColor: colors.primary[500],
    },
    optionEmoji: {
      fontSize: 16,
    },
    optionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    optionLabelSelected: {
      color: colors.primary[700],
      fontWeight: '700',
    },
  });
}
