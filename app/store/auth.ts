import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthStatus = 'unknown' | 'logged-out' | 'needs-onboarding' | 'needs-paywall' | 'active';

export type AuthState = {
  status: AuthStatus;
  onboardingStep: number;
  notificationOptIn: boolean;
  setStatus: (status: AuthStatus) => void;
  nextOnboardingStep: () => void;
  setNotificationOptIn: (enabled: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  onboardingStep: 0,
  notificationOptIn: false,
  setStatus: (status: AuthStatus) => set({ status }),
  nextOnboardingStep: () =>
    set((state: AuthState) => ({ onboardingStep: state.onboardingStep + 1, status: state.status })),
  setNotificationOptIn: (enabled: boolean) => set({ notificationOptIn: enabled }),
}));

export async function persistStatus(status: AuthStatus) {
  await AsyncStorage.setItem('platelens:authStatus', status);
}
