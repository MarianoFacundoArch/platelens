import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/hooks/useTheme';
import { track } from '@/lib/analytics';
import { setCachedScan } from '@/lib/mmkv';
import { initPhotoScan, queuePhotoScan, waitForScanCompletion } from '@/lib/scan';
import { saveCompressedScan, cleanupOldScans, uploadToSignedUrl } from '@/lib/imageStorage';
import { formatLocalDateISO } from '@/lib/dateUtils';

type CameraState = 'requesting-permission' | 'permission-denied' | 'processing' | 'idle';

export default function CameraScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetDateISO = typeof params.dateISO === 'string' ? params.dateISO : undefined;
  const source = typeof params.source === 'string' ? params.source : 'home';
  const [state, setState] = useState<CameraState>('requesting-permission');
  const [error, setError] = useState<string | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [savedImageUri, setSavedImageUri] = useState<string | null>(null);

  // Keep screen awake during processing
  useEffect(() => {
    if (state === 'processing') {
      activateKeepAwakeAsync('camera-processing');
      return () => {
        deactivateKeepAwake('camera-processing');
      };
    }
  }, [state]);

  useEffect(() => {
    // Small delay to let navigation complete
    const timer = setTimeout(() => {
      launchCamera();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const runScanFlow = async (localUri: string) => {
    // Init, upload, and queue scan (don't wait for completion)
    const init = await initPhotoScan();
    await uploadToSignedUrl(localUri, init.uploadUrl, init.uploadHeaders, init.uploadMethod);
    const queued = await queuePhotoScan(init.scanId, targetDateISO);

    // Track that scan was queued
    track('scan_queued', {
      scanId: init.scanId,
      mealId: queued.mealId,
    });

    // Return scan and meal IDs to use in navigation
    return {
      scanId: init.scanId,
      mealId: queued.mealId,
      imageUri: localUri,
    };
  };

  const launchCamera = async () => {
    try {
      setState('requesting-permission');

      // Clean up old scans before capturing new one
      cleanupOldScans();

      // Request permissions first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        setState('permission-denied');
        return;
      }

      // Launch native camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      // User canceled
      if (result.canceled) {
        router.back();
        return;
      }

      if (!result.assets[0].uri) {
        throw new Error('No image data from camera');
      }

      // Store the captured image data for display and potential retry
      setCapturedImageUri(result.assets[0].uri);

      // Show processing state
      setState('processing');

      // Save compressed image to permanent storage
      const savedUri = await saveCompressedScan(result.assets[0].uri);
      setSavedImageUri(savedUri);

      await runScanFlow(savedUri);

      // Navigate back based on where we came from
      if (source === 'history') {
        // Return to History tab
        router.back();
      } else {
        // Navigate to home where the meal will show as "processing"
        router.replace({
          pathname: '/(app)/home',
          params: { scrollToMeals: 'true' },
        });
      }
    } catch (error) {
      console.error('Camera error:', error);

      // User-friendly error messages
      let errorMessage = 'Something went wrong while analyzing your meal';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network connection lost. Please check your internet and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'The scan took too long. Please try again.';
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          errorMessage = 'Our servers are having issues. Please try again in a moment.';
        }
      }

      setError(errorMessage);
      setState('idle');
    }
  };

  const retryScan = async () => {
    if (!savedImageUri) {
      // If we don't have cached data, launch camera again
      launchCamera();
      return;
    }

    try {
      setError(null);
      setState('processing');

      await runScanFlow(savedImageUri);

      track('scan_retry_success', {});

      // Navigate back based on where we came from
      if (source === 'history') {
        // Return to History tab
        router.back();
      } else {
        // Navigate to home where the meal will show as "processing"
        router.replace({
          pathname: '/(app)/home',
          params: { scrollToMeals: 'true' },
        });
      }
    } catch (error) {
      console.error('Retry scan error:', error);

      let errorMessage = 'Still having trouble analyzing your meal';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network connection lost. Please check your internet and try again.';
        }
      }

      setError(errorMessage);
      setState('idle');
    }
  };

  // Processing state
  if (state === 'processing') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          {capturedImageUri ? (
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.capturedImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.iconContainer}>
              <Ionicons name="restaurant" size={64} color={colors.primary[500]} />
            </View>
          )}
          <ActivityIndicator size="large" color={colors.primary[500]} style={styles.spinner} />
          <Text style={styles.loadingTitle}>Analyzing your plate...</Text>
          <Text style={styles.loadingSubtitle}>
            Our AI is identifying foods and calculating nutrition
          </Text>
        </View>
      </View>
    );
  }

  // Permission denied state
  if (state === 'permission-denied') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="camera-off" size={64} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorSubtitle}>
            PlateLens needs camera access to analyze your meals
          </Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          {capturedImageUri && (
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.errorImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={64} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Scan Failed</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <View style={styles.errorButtons}>
            <Pressable style={styles.retryButton} onPress={retryScan}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Requesting permission / idle state
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F9FAFB', '#FFFFFF']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingTitle}>Opening camera...</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof import('@/config/theme').getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    capturedImage: {
      width: 240,
      height: 240,
      borderRadius: 20,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: colors.primary[200],
    },
    errorIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    spinner: {
      marginVertical: 16,
    },
    loadingTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    loadingSubtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    errorSubtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    errorImage: {
      width: 200,
      height: 200,
      borderRadius: 16,
      marginBottom: 24,
      borderWidth: 2,
      borderColor: colors.error + '40',
      opacity: 0.7,
    },
    errorButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      paddingHorizontal: 20,
    },
    retryButton: {
      flex: 1,
      backgroundColor: colors.primary[500],
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    backButton: {
      flex: 1,
      backgroundColor: colors.border.subtle,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    button: {
      backgroundColor: colors.primary[500],
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}
