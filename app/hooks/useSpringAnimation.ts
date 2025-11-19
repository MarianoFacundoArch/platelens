import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { theme } from '@/config/theme';

/**
 * iOS-style spring animation hook
 * Provides smooth, natural motion with physics-based easing
 */

type SpringConfig = 'spring' | 'bouncy' | 'smooth' | 'linear';

interface UseSpringAnimationOptions {
  /** Initial value */
  initialValue?: number;
  /** Spring configuration preset */
  config?: SpringConfig;
  /** Auto-start animation on mount */
  autoStart?: boolean;
  /** Target value to animate to */
  toValue?: number;
}

export function useSpringAnimation({
  initialValue = 0,
  config = 'spring',
  autoStart = false,
  toValue = 1,
}: UseSpringAnimationOptions = {}) {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;

  const getSpringConfig = (preset: SpringConfig) => {
    const configs = theme.animations.easing;
    return {
      ...configs[preset],
      useNativeDriver: true,
    };
  };

  const start = (targetValue?: number, springConfig?: SpringConfig) => {
    return new Promise<void>((resolve) => {
      Animated.spring(animatedValue, {
        toValue: targetValue ?? toValue,
        ...getSpringConfig(springConfig ?? config),
      }).start(() => resolve());
    });
  };

  const reset = () => {
    animatedValue.setValue(initialValue);
  };

  const setValue = (value: number) => {
    animatedValue.setValue(value);
  };

  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, [autoStart]);

  return {
    animatedValue,
    start,
    reset,
    setValue,
  };
}

/**
 * Pre-configured animation presets
 */
export function useScaleAnimation(options?: { autoStart?: boolean }) {
  return useSpringAnimation({
    initialValue: 0.9,
    toValue: 1,
    config: 'spring',
    ...options,
  });
}

export function useFadeAnimation(options?: { autoStart?: boolean }) {
  return useSpringAnimation({
    initialValue: 0,
    toValue: 1,
    config: 'smooth',
    ...options,
  });
}

export function useSlideAnimation(options?: { autoStart?: boolean; fromValue?: number }) {
  return useSpringAnimation({
    initialValue: options?.fromValue ?? 50,
    toValue: 0,
    config: 'spring',
    ...options,
  });
}

export function useBounceAnimation() {
  return useSpringAnimation({
    initialValue: 1,
    config: 'bouncy',
  });
}
