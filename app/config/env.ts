import { Platform } from 'react-native';

// Determine Functions emulator URL based on platform in development
const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // In development, use local emulator
  if (__DEV__) {
    const functionsHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    return `http://${functionsHost}:5001/platelens-3333/us-central1/api`;
  }

  // Production default
  return 'https://us-central1-platelens-3333.cloudfunctions.net/api';
};

export const env = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
  },
  apiBaseUrl: getApiBaseUrl(),
  revenueCat: {
    iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
    androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
    offering: process.env.EXPO_PUBLIC_REVENUECAT_OFFERING ?? 'default',
  },
  dynamicLinksDomain: process.env.EXPO_PUBLIC_DYNAMIC_LINK_DOMAIN ?? '',
  notificationCadence: process.env.EXPO_PUBLIC_NOTIFICATION_CADENCE ?? 'aggressive',
};
