import { useRouter } from 'expo-router';
import { Text, View, Image } from 'react-native';

import { Brand } from '@/config/brand';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';

export default function SplashScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View className="items-center mt-24 gap-6">
        <Image source={require('../../assets/images/icon.png')} style={{ height: 88, width: 88 }} />
        <Text className="text-4xl font-semibold text-ink-900">Welcome to {Brand.name}</Text>
        <Text className="text-center text-ink-500">
          Instant meal scanning. Aggressive accountability. Built to convert consistency into streaks.
        </Text>
      </View>
      <PrimaryButton label="Continue" onPress={() => router.push('/(onboarding)/notifications')} />
      <Text className="text-xs text-ink-500 text-center">
        We preload the paywall so there is zero delay when it is time to start your trial.
      </Text>
    </Screen>
  );
}
