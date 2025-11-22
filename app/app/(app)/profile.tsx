import { Linking, Text, View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { theme } from '@/config/theme';
import { useAuthStore, type AuthState } from '@/store/auth';
import { persistStatus } from '@/store/auth';
import { useHaptics } from '@/hooks/useHaptics';

export default function ProfileScreen() {
  const setStatus = useAuthStore((state: AuthState) => state.setStatus);
  const { light } = useHaptics();

  const handleLogout = async () => {
    setStatus('logged-out');
    await persistStatus('logged-out');
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#E0F7F4', '#F0FFFE', '#FFFFFF']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
        contentInset={{ top: 60 }}
        contentOffset={{ x: 0, y: -60 }}
        automaticallyAdjustContentInsets={false}
      >
        {/* Header */}
        <ScreenHeader title="Profile" />

        {/* User Stats Card */}
        <Card variant="elevated" padding="lg" style={styles.statsCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color={theme.colors.primary[500]} />
            </View>
            <Text style={styles.userName}>Health Enthusiast</Text>
            <Text style={styles.userEmail}>user@platelens.app</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>14</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>127</Text>
              <Text style={styles.statLabel}>Total Meals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>1,950</Text>
              <Text style={styles.statLabel}>Avg. Cals</Text>
            </View>
          </View>
        </Card>

        {/* Subscription Card */}
        <Card variant="elevated" padding="lg" style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          </View>

          <Text style={styles.subscriptionTitle}>PlateLens Annual</Text>
          <Text style={styles.subscriptionSubtitle}>Unlimited scans & insights</Text>

          <View style={styles.subscriptionDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.ink[500]} />
              <Text style={styles.detailText}>Renews November 12, 2025</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={16} color={theme.colors.ink[500]} />
              <Text style={styles.detailText}>$49.99/year</Text>
            </View>
          </View>

          <Button
            variant="secondary"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          >
            Manage Subscription
          </Button>
        </Card>

        {/* Goals Card */}
        <Card variant="elevated" padding="lg" style={styles.goalsCard}>
          <Text style={styles.sectionTitle}>Your Goals</Text>

          <View style={styles.goalRow}>
            <View style={styles.goalIcon}>
              <Ionicons name="flame-outline" size={20} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.goalContent}>
              <Text style={styles.goalLabel}>Daily Calories</Text>
              <Text style={styles.goalValue}>1,950 kcal</Text>
            </View>
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalIcon}>
              <Ionicons name="fitness-outline" size={20} color={theme.colors.protein.main} />
            </View>
            <View style={styles.goalContent}>
              <Text style={styles.goalLabel}>Protein Target</Text>
              <Text style={styles.goalValue}>140g per day</Text>
            </View>
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalIcon}>
              <Ionicons name="trending-down-outline" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.goalContent}>
              <Text style={styles.goalLabel}>Weight Goal</Text>
              <Text style={styles.goalValue}>Lose 5 kg</Text>
            </View>
          </View>

          <Button variant="ghost" onPress={() => light()}>
            Edit Goals
          </Button>
        </Card>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <Card variant="elevated" padding="none" style={styles.settingsList}>
            <SettingsItem
              icon="notifications-outline"
              label="Notifications"
              onPress={() => light()}
            />
            <SettingsItem
              icon="moon-outline"
              label="Dark Mode"
              onPress={() => light()}
            />
            <SettingsItem
              icon="scale-outline"
              label="Units"
              value="Metric"
              onPress={() => light()}
            />
            <SettingsItem
              icon="help-circle-outline"
              label="Help & Support"
              onPress={() => light()}
            />
          </Card>
        </View>

        {/* Legal Section */}
        <View style={styles.legalSection}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <Card variant="elevated" padding="none" style={styles.settingsList}>
            <SettingsItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://platelens.app/legal/privacy')}
            />
            <SettingsItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => Linking.openURL('https://platelens.app/legal/terms')}
              showChevron
            />
          </Card>
        </View>

        {/* Logout Button */}
        <Button
          variant="danger"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Log Out
        </Button>

        {/* Version */}
        <Text style={styles.versionText}>Version 1.0.0 (Build 1)</Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function SettingsItem({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
}: {
  icon: any;
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
}) {
  const { light } = useHaptics();

  const handlePress = () => {
    light();
    onPress();
  };

  return (
    <Card
      variant="flat"
      padding="md"
      onPress={handlePress}
      style={styles.settingsItem}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={20} color={theme.colors.ink[600]} />
        <Text style={styles.settingsItemLabel}>{label}</Text>
      </View>
      <View style={styles.settingsItemRight}>
        {value && <Text style={styles.settingsItemValue}>{value}</Text>}
        {showChevron && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.ink[400]} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.ink[500],
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ink[100],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary[500],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.ink[500],
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.ink[100],
  },
  subscriptionCard: {
    marginBottom: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C4941A',
  },
  subscriptionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 4,
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: theme.colors.ink[500],
    marginBottom: 20,
  },
  subscriptionDetails: {
    gap: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.ink[600],
  },
  goalsCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 16,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.ink[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalContent: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 14,
    color: theme.colors.ink[600],
    marginBottom: 2,
  },
  goalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink[900],
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsList: {
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ink[50],
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemLabel: {
    fontSize: 16,
    color: theme.colors.ink[900],
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsItemValue: {
    fontSize: 14,
    color: theme.colors.ink[500],
  },
  legalSection: {
    marginBottom: 24,
  },
  logoutButton: {
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.ink[400],
    textAlign: 'center',
  },
});
