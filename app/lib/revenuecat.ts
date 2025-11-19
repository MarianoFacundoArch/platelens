import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

import { env } from '@/config/env';

let configured = false;

export function configureRevenueCat() {
  if (configured) return;
  const apiKey = Platform.OS === 'ios' ? env.revenueCat.iosKey : env.revenueCat.androidKey;
  if (!apiKey) {
    console.warn('RevenueCat API key missing, running in mock mode');
    return;
  }
  Purchases.configure({ apiKey });
  configured = true;
}

export async function fetchOfferings() {
  configureRevenueCat();
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.warn('offerings failed', error);
    return null;
  }
}
