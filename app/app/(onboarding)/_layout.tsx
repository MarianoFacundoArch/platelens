import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="funnel" />
      <Stack.Screen name="plan" />
    </Stack>
  );
}
