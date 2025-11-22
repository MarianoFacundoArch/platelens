import { useRouter } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useMemo } from 'react';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { track } from '@/lib/analytics';
import { persistStatus, useAuthStore, type AuthState } from '@/store/auth';
import { useTheme } from '@/hooks/useTheme';

export default function AuthScreen() {
  const router = useRouter();
  const setStatus = useAuthStore((state: AuthState) => state.setStatus);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <Pressable style={styles.appleButton} onPress={() => handleProviderPress('apple')}>
        <Text style={styles.appleButtonText}>Continue with Apple</Text>
      </Pressable>
      <Pressable style={styles.googleButton} onPress={() => handleProviderPress('google')}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </Pressable>
    </Screen>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    appleButton: {
      backgroundColor: colors.ink[900], // Apple brand: dark in both modes
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    appleButtonText: {
      color: colors.text.inverse,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    },
    googleButton: {
      backgroundColor: colors.background.card,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    googleButtonText: {
      color: colors.text.primary,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
