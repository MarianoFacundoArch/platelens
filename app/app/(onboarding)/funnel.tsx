import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingStepCard } from '@/components/OnboardingStepCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { useAuthStore, type AuthState } from '@/store/auth';
import { track } from '@/lib/analytics';

const steps = [
  { question: 'How old are you?', placeholder: '28' },
  { question: 'Height in cm?', placeholder: '178' },
  { question: 'Current weight (kg)?', placeholder: '72' },
  { question: 'Goal (cut, bulk, maintain)?', placeholder: 'cut' },
  { question: 'Target change (kg)?', placeholder: '-5' },
  { question: 'Dietary prefs?', placeholder: 'High protein, low sugar' },
];

export default function FunnelScreen() {
  const router = useRouter();
  const onboardingStep = useAuthStore((state: AuthState) => state.onboardingStep);
  const next = useAuthStore((state: AuthState) => state.nextOnboardingStep);
  const setStatus = useAuthStore((state: AuthState) => state.setStatus);

  const done = onboardingStep >= steps.length;

  const handleSubmit = (value: string) => {
    track('onboarding_step_completed', { index: onboardingStep, value_length: value?.length ?? 0 });
    next();
  };

  return (
    <Screen>
      <View className="mt-12 gap-3">
        <Text className="text-3xl font-semibold text-ink-900">Dial in the basics</Text>
        <Text className="text-sm text-ink-500">
          {done ? 'Great! Generating your plan now.' : `Step ${onboardingStep + 1} of ${steps.length}`}
        </Text>
      </View>
      {done ? (
        <View className="gap-4">
          <Text className="text-base text-ink-600">
            We animate the plan creation for 3 seconds to build anticipation before paywall.
          </Text>
          <Text className="text-base text-ink-600">
            Continue when ready and we will lock you into the gate.
          </Text>
          <View className="mt-6">
            <PrimaryButton
              label="Generate plan"
              onPress={() => {
                setStatus('needs-paywall');
                router.push('/(onboarding)/plan');
              }}
            />
          </View>
        </View>
      ) : (
        <OnboardingStepCard
          question={steps[onboardingStep].question}
          placeholder={steps[onboardingStep].placeholder}
          onSubmit={handleSubmit}
        />
      )}
    </Screen>
  );
}
