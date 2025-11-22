import { Pressable, StyleSheet, Text, View, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useMemo } from 'react';

export type Tab = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type TabSelectorProps = {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
};

function TabItem({ tab, isActive, onPress, colors, styles }: {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof import('@/config/theme').getColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1 : 0.95,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.tabWrapper}>
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.tab,
            isActive && styles.tabActive,
            {
              transform: [{ scale: pressed ? 0.96 : scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Ionicons
            name={tab.icon}
            size={20}
            color={isActive ? colors.primary[600] : colors.text.secondary}
          />
          <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

export function TabSelector({ tabs, activeTabId, onTabChange }: TabSelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onPress={() => onTabChange(tab.id)}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    scrollContent: {
      paddingHorizontal: 16,
      flexGrow: 1,
      justifyContent: 'center',
    },
    tabsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    tabWrapper: {
      minWidth: 100,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.background.subtle,
      borderWidth: 1,
      borderColor: 'transparent',
      minHeight: 48,
    },
    tabActive: {
      backgroundColor: colors.background.elevated,
      borderColor: colors.primary[200],
      shadowColor: colors.primary[600],
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.secondary,
      letterSpacing: 0.2,
    },
    tabLabelActive: {
      color: colors.primary[400],
    },
  });
}
