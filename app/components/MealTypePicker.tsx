import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { theme } from '@/config/theme';

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
              onPress={() => onSelect(type.value)}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink[600],
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
    backgroundColor: theme.colors.ink[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink[600],
  },
  optionLabelSelected: {
    color: theme.colors.primary[700],
    fontWeight: '700',
  },
});
