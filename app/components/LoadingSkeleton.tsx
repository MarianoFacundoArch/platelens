import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/config/theme';

interface LoadingSkeletonProps {
  /** Width of skeleton */
  width?: number | string;
  /** Height of skeleton */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Custom style */
  style?: ViewStyle;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular';
}

export function LoadingSkeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  variant = 'rectangular',
}: LoadingSkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Get variant-specific styles
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'text':
        return {
          height: height,
          borderRadius: 4,
        };
      case 'circular':
        return {
          width: height,
          height: height,
          borderRadius: height / 2,
        };
      case 'rectangular':
        return {
          height: height,
          borderRadius: borderRadius,
        };
      default:
        return {};
    }
  };

  // Shimmer animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  // Interpolate opacity for shimmer effect
  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  const containerStyle: ViewStyle = {
    width: variant === 'circular' ? height : width,
    ...getVariantStyles(),
    ...style,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.shimmer, { opacity }]}>
        <LinearGradient
          colors={[
            theme.colors.ink[100],
            theme.colors.ink[50],
            theme.colors.ink[100],
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Skeleton group for multiple skeletons
 */
interface SkeletonGroupProps {
  /** Number of skeleton lines */
  lines?: number;
  /** Spacing between lines */
  spacing?: number;
  /** Custom styles for each line */
  style?: ViewStyle;
}

export function SkeletonGroup({ lines = 3, spacing = 12, style }: SkeletonGroupProps) {
  return (
    <View style={{ gap: spacing }}>
      {Array.from({ length: lines }).map((_, index) => (
        <LoadingSkeleton
          key={index}
          width={index === lines - 1 ? '60%' : '100%'}
          height={16}
          style={style}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.ink[100],
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
});
