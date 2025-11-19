import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import { SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Inter_500Medium, Inter_600SemiBold, Inter_400Regular } from '@expo-google-fonts/inter';

import '../global.css';
import { queryClient } from '@/lib/queryClient';
import { Brand } from '@/config/brand';
import { useHydratedAuth } from '@/hooks/useHydratedAuth';
import { cleanupOldScans } from '@/lib/imageStorage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useHydratedAuth();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Clean up old scan images on app start
  useEffect(() => {
    cleanupOldScans();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Brand.neutral.surface }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(paywall)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen
            name="camera"
            options={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card', headerShown: false }}
          />
          <Stack.Screen name="scan-result" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
