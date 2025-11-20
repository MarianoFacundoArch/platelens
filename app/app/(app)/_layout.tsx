import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useHaptics } from '@/hooks/useHaptics';

export default function AppTabsLayout() {
  const { selection } = useHaptics();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00C2A8',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
        }}
        listeners={{
          tabPress: () => selection(),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={20} color={color} />,
        }}
        listeners={{
          tabPress: () => selection(),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
        }}
        listeners={{
          tabPress: () => selection(),
        }}
      />
    </Tabs>
  );
}
