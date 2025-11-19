import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback hook
 * Provides iOS-style haptic feedback for user interactions
 */

export function useHaptics() {
  /**
   * Light impact for subtle interactions
   * Use for: Button taps, toggle switches
   */
  const light = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Medium impact for standard interactions
   * Use for: Card selection, drag and drop
   */
  const medium = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Heavy impact for important interactions
   * Use for: Major state changes, confirmations
   */
  const heavy = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Rigid impact for precise interactions
   * Use for: Picker selection, slider snap points
   */
  const rigid = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Soft impact for gentle interactions
   * Use for: Subtle UI feedback
   */
  const soft = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Success notification
   * Use for: Successful completions, confirmations
   */
  const success = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Warning notification
   * Use for: Warnings, attention needed
   */
  const warning = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Error notification
   * Use for: Errors, failed actions
   */
  const error = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Haptics not available on this device
    }
  };

  /**
   * Selection changed
   * Use for: Picker wheels, segment controls
   */
  const selection = async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Haptics not available on this device
    }
  };

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
