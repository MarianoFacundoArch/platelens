import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useFlowGate } from '@/hooks/useFlowGate';

export default function Index() {
  const gate = useFlowGate();

  if (gate === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
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
