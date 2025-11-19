import Constants from 'expo-constants';
import { useState } from 'react';

import { track } from '@/lib/analytics';
import { useAuthStore, type AuthState } from '@/store/auth';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (notificationsModule) return notificationsModule;

  // Expo Go does not have full notifications support; avoid loading the module there.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  try {
    const mod = await import('expo-notifications');
    notificationsModule = mod;
    return mod;
  } catch (error) {
    console.warn('notifications module load error', error);
    return null;
  }
}

export function useNotificationPrimer() {
  const [status, setStatus] = useState<'idle' | 'prompting' | 'granted' | 'denied'>('idle');
  const setOptIn = useAuthStore((state: AuthState) => state.setNotificationOptIn);

  const request = async () => {
    const Notifications = await getNotificationsModule();

    // In Expo Go (or if the module failed to load), just no-op.
    if (!Notifications) {
      if (__DEV__) {
        console.log('[notifications] (noop) request called in unsupported environment');
      }
      return;
    }

    setStatus('prompting');
    track('notifications_prompt_shown');
    const { status: result } = await Notifications.requestPermissionsAsync();
    if (result === 'granted') {
      setStatus('granted');
      setOptIn(true);
      track('notifications_granted');
    } else {
      setStatus('denied');
      setOptIn(false);
    }
  };

  return { status, request };
}
