import { View, Text, Pressable, StyleSheet, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useState, useMemo } from 'react';
import { useHaptics } from '@/hooks/useHaptics';

export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'snack' | 'dinner' | 'pre-workout' | 'post-workout';

interface MealOption {
  type: MealType;
  label: string;
  emoji: string;
}

const MEAL_OPTIONS: MealOption[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { type: 'brunch', label: 'Brunch', emoji: '🥐' },
  { type: 'lunch', label: 'Lunch', emoji: '🌞' },
  { type: 'snack', label: 'Snack', emoji: '🍎' },
  { type: 'dinner', label: 'Dinner', emoji: '🌙' },
  { type: 'pre-workout', label: 'Pre-Workout', emoji: '💪' },
  { type: 'post-workout', label: 'Post-Workout', emoji: '🏋️' },
];

interface MealTypeSelectorProps {
  selected: MealType;
  onSelect: (type: MealType) => void;
}

export function MealTypeSelector({ selected, onSelect }: MealTypeSelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { light, selection } = useHaptics();
  const [showPicker, setShowPicker] = useState(false);
  const selectedOption = MEAL_OPTIONS.find((opt) => opt.type === selected) || MEAL_OPTIONS[0];

  const handleSelect = (type: MealType) => {
    selection();
    onSelect(type);
    setShowPicker(false);
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.label}>Meal Type</Text>
        <Pressable
          onPress={() => {
            light();
            setShowPicker(true);
          }}
          style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]}
        >
          <View style={styles.selectorContent}>
            <Text style={styles.emoji}>{selectedOption.emoji}</Text>
            <Text style={styles.selectedLabel}>{selectedOption.label}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.text.tertiary} />
        </Pressable>
      </View>

      <Modal visible={showPicker} transparent animationType="slide">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            light();
            setShowPicker(false);
          }}
        >
          <View style={styles.pickerContainer}>
            <SafeAreaView>
              <View style={styles.pickerHeader}>
                <Pressable
                  onPress={() => {
                    light();
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.doneButton}>Done</Text>
                </Pressable>
              </View>
              {MEAL_OPTIONS.map((option) => (
                <Pressable
                  key={option.type}
                  onPress={() => handleSelect(option.type)}
                  style={styles.pickerOption}
                >
                  <Text style={styles.pickerEmoji}>{option.emoji}</Text>
                  <Text style={styles.pickerLabel}>{option.label}</Text>
                  {selected === option.type && (
                    <Ionicons name="checkmark" size={24} color={colors.primary[500]} />
                  )}
                </Pressable>
              ))}
            </SafeAreaView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Helper function to auto-detect meal type based on current time
export function autoDetectMealType(): MealType {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 11) return 'brunch';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack'; // Late night
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
      marginBottom: 8,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.background.card,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.ink[200],
    },
    selectorPressed: {
      backgroundColor: colors.primary[50],
      borderColor: colors.primary[400],
    },
    selectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    emoji: {
      fontSize: 22,
    },
    selectedLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerContainer: {
      backgroundColor: colors.background.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    doneButton: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.primary[500],
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.background.subtle,
    },
    pickerEmoji: {
      fontSize: 24,
    },
    pickerLabel: {
      flex: 1,
      fontSize: 17,
      color: colors.text.primary,
    },
  });
}
