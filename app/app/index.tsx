import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';

import { useFlowGate } from '@/hooks/useFlowGate';
import { useTheme } from '@/hooks/useTheme';

export default function Index() {
  const gate = useFlowGate();
  const { colors } = useTheme();

  if (gate === 'loading') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.default }]}>
        <ActivityIndicator />
        <Text className="mt-4 text-ink-500">Loading PlateLens…</Text>
      </View>
    );
  }

  if (gate === 'auth' || gate === 'onboarding') {
    return <Redirect href="/(onboarding)/splash" />;
  }

  if (gate === 'plan') {
    return <Redirect href="/(onboarding)/plan" />;
  }

  if (gate === 'paywall') {
    return <Redirect href="/(paywall)" />;
  }

  return <Redirect href="/(app)/home" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
