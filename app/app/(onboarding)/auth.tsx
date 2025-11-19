import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { track } from '@/lib/analytics';
import { persistStatus, useAuthStore, type AuthState } from '@/store/auth';

export default function AuthScreen() {
  const router = useRouter();
  const setStatus = useAuthStore((state: AuthState) => state.setStatus);

  const handleProviderPress = async (provider: 'apple' | 'google') => {
    track('login_started', { provider });
    // TODO: wire Firebase Auth once Apple dev account is ready.
    setStatus('needs-onboarding');
    await persistStatus('needs-onboarding');
    track('login_completed', { provider });
    router.push('/(onboarding)/funnel');
  };

  return (
    <Screen>
      <View className="gap-4 mt-16">
        <Text className="text-3xl font-semibold text-ink-900">Continue securely</Text>
        <Text className="text-base text-ink-600">
          PlateLens only supports Apple and Google sign in. No passwords, no spam. Continue to lock in your streak.
        </Text>
      </View>
      <Pressable className="bg-black rounded-2xl py-4 px-4" onPress={() => handleProviderPress('apple')}>
        <Text className="text-white text-center text-base font-semibold">Continue with Apple</Text>
      </Pressable>
      <Pressable className="bg-white rounded-2xl py-4 px-4 border border-ink-100" onPress={() => handleProviderPress('google')}>
        <Text className="text-center text-base font-semibold text-ink-900">Continue with Google</Text>
      </Pressable>
    </Screen>
  );
}
