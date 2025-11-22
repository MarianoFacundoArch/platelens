import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { hexToRgba } from '@/config/theme';
import { queueTextScan, waitForScanCompletion } from '@/lib/scan';
import type { ScanResponse } from '@/lib/scan';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

type TextMealModalProps = {
  visible: boolean;
  onClose: () => void;
  onAnalyzed: (result: ScanResponse) => void;
  dateISO?: string;
};

export function TextMealModal({ visible, onClose, onAnalyzed, dateISO }: TextMealModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the screen awake while a text scan is in progress
  useEffect(() => {
    if (isAnalyzing) {
      activateKeepAwakeAsync('text-scan');
      return () => {
        deactivateKeepAwake('text-scan');
      };
    }

    deactivateKeepAwake('text-scan');
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError('Please enter a meal description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const queued = await queueTextScan(description.trim(), dateISO);

      // Close modal and notify parent immediately
      // The meal will show as "processing" in the home screen
      setDescription('');
      setIsAnalyzing(false);
      onClose();
      onAnalyzed({ scanId: queued.scanId, mealId: queued.mealId } as any);
    } catch (err) {
      console.error('Failed to analyze meal text:', err);
      setError('Failed to analyze meal. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      setDescription('');
      setError(null);
      onClose();
    }
  };

  const examples = [
    '2 scrambled eggs with toast and butter',
    'Chicken caesar salad with dressing',
    'Bowl of oatmeal with banana and honey',
    'Slice of pepperoni pizza',
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height={520}
      avoidKeyboard
      keyboardOffset={24}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="create" size={24} color={colors.primary[400]} />
          </View>
          <Text style={styles.title}>Describe Your Meal</Text>
          <Text style={styles.subtitle}>
            Tell us what you ate and we'll calculate the nutrition
          </Text>
        </View>

        {/* Text Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2 scrambled eggs with toast"
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setError(null);
            }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isAnalyzing}
            returnKeyType="done"
            blurOnSubmit={true}
          />
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Examples */}
        <View style={styles.examplesSection}>
          <Text style={styles.examplesTitle}>Examples:</Text>
          {examples.map((example, index) => (
            <Text key={index} style={styles.exampleText}>
              • {example}
            </Text>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="primary"
            onPress={handleAnalyze}
            disabled={!description.trim() || isAnalyzing}
            loading={isAnalyzing}
            style={styles.analyzeButton}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Meal'}
          </Button>
          <Button
            variant="ghost"
            onPress={handleClose}
            disabled={isAnalyzing}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 6,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 19,
    },
    inputContainer: {
      marginBottom: 16,
    },
    input: {
      backgroundColor: colors.background.subtle,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text.primary,
      minHeight: 100,
      maxHeight: 140,
      borderWidth: 2,
      borderColor: colors.border.subtle,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: hexToRgba(colors.error, 0.06),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: hexToRgba(colors.error, 0.19),
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: colors.error,
      fontWeight: '500',
    },
    examplesSection: {
      backgroundColor: colors.background.elevated,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    examplesTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary[400],
      marginBottom: 6,
    },
    exampleText: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
      marginBottom: 3,
    },
    actions: {
      gap: 12,
    },
    analyzeButton: {
      marginBottom: 0,
    },
    cancelButton: {
      marginBottom: 0,
    },
  });
}
