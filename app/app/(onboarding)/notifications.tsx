import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReminderList } from '@/components/ReminderList';
import { Screen } from '@/components/ui/Screen';
import { useNotificationPrimer } from '@/hooks/useNotificationPrimer';

export default function NotificationPrimer() {
  const router = useRouter();
  const { status, request } = useNotificationPrimer();

  return (
    <Screen>
      <View className="gap-4 mt-16">
        <Text className="text-3xl font-semibold text-ink-900">Protect your streak</Text>
        <Text className="text-base text-ink-600">
          Notifications are mandatory through trial so we can nudge you into action. We stay aggressive but
          respectful of quiet hours.
        </Text>
        <ReminderList />
      </View>
      <PrimaryButton label="Enable notifications" onPress={request} loading={status === 'prompting'} />
      <PrimaryButton
        label="Continue"
        variant="secondary"
        onPress={() => router.push('/(onboarding)/auth')}
      />
    </Screen>
  );
}
