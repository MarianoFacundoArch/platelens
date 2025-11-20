import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { theme } from '@/config/theme';
import { scanMealByText } from '@/lib/scan';
import type { ScanResponse } from '@/lib/scan';

type TextMealModalProps = {
  visible: boolean;
  onClose: () => void;
  onAnalyzed: (result: ScanResponse) => void;
};

export function TextMealModal({ visible, onClose, onAnalyzed }: TextMealModalProps) {
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError('Please enter a meal description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await scanMealByText(description.trim());

      // Close modal and pass result to parent
      setDescription('');
      onClose();
      onAnalyzed(result);
    } catch (err) {
      console.error('Failed to analyze meal text:', err);
      setError('Failed to analyze meal. Please try again.');
    } finally {
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
            <Ionicons name="create" size={24} color={theme.colors.primary[600]} />
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
            placeholderTextColor={theme.colors.ink[400]}
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
            <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
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

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.ink[600],
    textAlign: 'center',
    lineHeight: 19,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: theme.colors.ink[50],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.ink[900],
    minHeight: 100,
    maxHeight: 140,
    borderWidth: 2,
    borderColor: theme.colors.ink[100],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.colors.error + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '500',
  },
  examplesSection: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary[700],
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 13,
    color: theme.colors.ink[700],
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
