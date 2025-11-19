import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PlanStats } from '@/components/PlanStats';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { ProgressPulse } from '@/components/ProgressPulse';
import { useAuthStore, type AuthState } from '@/store/auth';
import { track } from '@/lib/analytics';

export default function PlanScene() {
  const router = useRouter();
  const setStatus = useAuthStore((state: AuthState) => state.setStatus);

  useEffect(() => {
    track('plan_generated');
  }, []);

  return (
    <Screen>
      <View className="gap-4 mt-12 items-center">
        <Text className="text-3xl font-semibold text-ink-900">Plan generation</Text>
        <Text className="text-center text-ink-600">
          We intentionally run this animation for ~4 seconds to warm up the paywall assets and build desire.
        </Text>
      </View>
      <ProgressPulse />
      <PlanStats targetCalories={1950} goalDate="Nov 12" />
      <PrimaryButton
        label="Continue"
        onPress={() => {
          setStatus('needs-paywall');
          track('paywall_shown');
          router.replace('/(paywall)');
        }}
      />
    </Screen>
  );
}
