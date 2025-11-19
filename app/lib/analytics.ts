import Constants from 'expo-constants';

type AnalyticsModule = typeof import('expo-firebase-analytics');

let analyticsModule: AnalyticsModule | null = null;

async function getAnalyticsModule(): Promise<AnalyticsModule | null> {
  if (analyticsModule) return analyticsModule;

  // Do not even load the native module in Expo Go; it is not available there.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  try {
    const mod = await import('expo-firebase-analytics');
    analyticsModule = mod;
    return mod;
  } catch (error) {
    console.warn('analytics module load error', error);
    return null;
  }
}

export type EventName =
  | 'app_install'
  | 'notifications_prompt_shown'
  | 'notifications_granted'
  | 'login_started'
  | 'login_completed'
  | 'onboarding_step_completed'
  | 'plan_generated'
  | 'paywall_shown'
  | 'paywall_cta_tapped'
  | 'trial_started'
  | 'purchase_completed'
  | 'camera_opened'
  | 'scan_completed'
  | 'log_saved'
  | 'share_card_created';

export async function track(name: EventName, params?: Record<string, unknown>) {
  const Analytics = await getAnalyticsModule();

  // In Expo Go (or if module failed to load), just log in dev and exit.
  if (!Analytics) {
    if (__DEV__) {
      console.log('[analytics] (noop)', name, params);
    }
    return;
  }

  try {
    await Analytics.logEvent(name, params);
  } catch (error) {
    console.warn('analytics error', error);
  }
}
