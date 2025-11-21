import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback hook
 * Provides iOS-style haptic feedback for user interactions
 */

export function useHaptics() {
  const impact = useCallback(async (style: Haptics.ImpactFeedbackStyle) => {
    try {
      await Haptics.impactAsync(style);
    } catch (error) {
      // Haptics not available on this device
    }
  }, []);

  /**
   * Light impact for subtle interactions
   * Use for: Button taps, toggle switches
   */
  const light = useCallback(async () => {
    await impact(Haptics.ImpactFeedbackStyle.Light);
  }, [impact]);

  /**
   * Medium impact for standard interactions
   * Use for: Card selection, drag and drop
   */
  const medium = useCallback(async () => {
    await impact(Haptics.ImpactFeedbackStyle.Medium);
  }, [impact]);

  /**
   * Heavy impact for important interactions
   * Use for: Major state changes, confirmations
   */
  const heavy = useCallback(async () => {
    await impact(Haptics.ImpactFeedbackStyle.Heavy);
  }, [impact]);

  /**
   * Rigid impact for precise interactions
   * Use for: Picker selection, slider snap points
   */
  const rigid = useCallback(async () => {
    await impact(Haptics.ImpactFeedbackStyle.Rigid);
  }, [impact]);

  /**
   * Soft impact for gentle interactions
   * Use for: Subtle UI feedback
   */
  const soft = useCallback(async () => {
    await impact(Haptics.ImpactFeedbackStyle.Soft);
  }, [impact]);

  const notify = useCallback(async (type: Haptics.NotificationFeedbackType) => {
    try {
      await Haptics.notificationAsync(type);
    } catch (error) {
      // Haptics not available on this device
    }
  }, []);

  /**
   * Success notification
   * Use for: Successful completions, confirmations
   */
  const success = useCallback(async () => {
    await notify(Haptics.NotificationFeedbackType.Success);
  }, [notify]);

  /**
   * Warning notification
   * Use for: Warnings, attention needed
   */
  const warning = useCallback(async () => {
    await notify(Haptics.NotificationFeedbackType.Warning);
  }, [notify]);

  /**
   * Error notification
   * Use for: Errors, failed actions
   */
  const error = useCallback(async () => {
    await notify(Haptics.NotificationFeedbackType.Error);
  }, [notify]);

  /**
   * Selection changed
   * Use for: Picker wheels, segment controls
   */
  const selection = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Haptics not available on this device
    }
  }, []);

  return {
    light,
    medium,
    heavy,
    rigid,
    soft,
    success,
    warning,
    error,
    selection,
  };
}
