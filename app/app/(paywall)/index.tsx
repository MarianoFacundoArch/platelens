import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PaywallPlanCard } from '@/components/PaywallPlanCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { usePaywallOptions } from '@/hooks/usePaywallOptions';
import { configureRevenueCat } from '@/lib/revenuecat';
import { track } from '@/lib/analytics';
import { persistStatus, useAuthStore, type AuthState } from '@/store/auth';

export default function PaywallScreen() {
  const options = usePaywallOptions();
  const router = useRouter();
  const setStatus = useAuthStore((state: AuthState) => state.setStatus);
  const [selected, setSelected] = useState(options[0].id);

  useEffect(() => {
    configureRevenueCat();
  }, []);

  const handlePurchase = async () => {
    track('paywall_cta_tapped', { option: selected });
    // TODO: integrate RevenueCat purchase flow once offerings wired.
    setStatus('active');
    await persistStatus('active');
    track('trial_started', { option: selected });
    router.replace('/(app)/home');
  };

  return (
    <Screen>
      <View className="mt-12 gap-4">
        <Text className="text-4xl font-semibold text-ink-900">Unlock PlateLens</Text>
        <Text className="text-base text-ink-600">
          Annual plan is default with {options[0].subline}. Monthly lives under the folded disclosure.
        </Text>
      </View>
      {options.map((option) => (
        <View key={option.id} className="gap-3">
          <PaywallPlanCard
            title={option.title}
            price={option.price}
            subline={option.subline}
            selected={selected === option.id}
          />
          <PrimaryButton label="Select" variant={selected === option.id ? 'primary' : 'secondary'} onPress={() => setSelected(option.id)} />
        </View>
      ))}
      <PrimaryButton label="Start free trial" onPress={handlePurchase} />
      <Text className="text-xs text-ink-500 text-center">
        Trial converts automatically after 7 days at $29.99/year. Cancel anytime in Settings.
      </Text>
      <Text className="text-center text-ink-600 mt-6" onPress={() => Alert.alert('Restore purchases coming soon')}>
        Restore purchases
      </Text>
    </Screen>
  );
}
