import { Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

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

function TabItem({ tab, isActive, onPress }: { tab: Tab; isActive: boolean; onPress: () => void }) {
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
            color={isActive ? theme.colors.primary[600] : theme.colors.ink[500]}
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
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onPress={() => onTabChange(tab.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  tabWrapper: {
    flex: 1,
    maxWidth: 100,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.ink[50],
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 48,
  },
  tabActive: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
    shadowColor: theme.colors.primary[600],
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
    color: theme.colors.ink[600],
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: theme.colors.primary[700],
  },
});
