import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';

export default function CoachScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.middle, colors.gradient.end]}
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
        <ScreenHeader title="Coach" />

        <View style={styles.content}>
          <Card>
            <View style={styles.comingSoonContainer}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primary[50] },
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={48}
                  color={colors.primary[500]}
                />
              </View>

              <Text style={[styles.title, { color: colors.text.primary }]}>
                AI Coach Coming Soon
              </Text>

              <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                Get personalized nutrition insights, meal recommendations, and smart
                coaching to help you reach your health goals.
              </Text>

              <View style={styles.featuresContainer}>
                <FeatureItem
                  icon="analytics-outline"
                  text="Smart meal analysis"
                  colors={colors}
                />
                <FeatureItem
                  icon="trending-up-outline"
                  text="Progress tracking"
                  colors={colors}
                />
                <FeatureItem
                  icon="bulb-outline"
                  text="Personalized tips"
                  colors={colors}
                />
                <FeatureItem
                  icon="restaurant-outline"
                  text="Recipe suggestions"
                  colors={colors}
                />
              </View>
            </View>
          </Card>

          <Card style={styles.betaCard}>
            <View style={styles.betaContainer}>
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={colors.primary[500]}
              />
              <Text style={[styles.betaText, { color: colors.text.secondary }]}>
                We're working hard to bring you AI-powered coaching features. Stay
                tuned for updates!
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: ReturnType<typeof import('@/config/theme').getColors>;
}

function FeatureItem({ icon, text, colors }: FeatureItemProps) {
  return (
    <View style={featureStyles.container}>
      <Ionicons name={icon} size={20} color={colors.primary[400]} />
      <Text style={[featureStyles.text, { color: colors.text.secondary }]}>
        {text}
      </Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  text: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
});

function createStyles(
  colors: ReturnType<typeof import('@/config/theme').getColors>,
  shadows: any
) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingTop: 12,
      gap: 16,
    },
    comingSoonContainer: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    featuresContainer: {
      width: '100%',
      gap: 4,
    },
    betaCard: {
      marginTop: 8,
    },
    betaContainer: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      padding: 16,
    },
    betaText: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      lineHeight: 20,
    },
  });
}
