import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { theme } from '@/config/theme';
import { track } from '@/lib/analytics';
import { setCachedScan } from '@/lib/mmkv';
import { scanImage } from '@/lib/scan';
import { saveCompressedScan, cleanupOldScans } from '@/lib/imageStorage';

type CameraState = 'requesting-permission' | 'permission-denied' | 'processing' | 'idle';

export default function CameraScreen() {
  const router = useRouter();
  const [state, setState] = useState<CameraState>('requesting-permission');
  const [error, setError] = useState<string | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
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
        base64: true,
      });

      // User canceled
      if (result.canceled) {
        router.back();
        return;
      }

      if (!result.assets[0].base64 || !result.assets[0].uri) {
        throw new Error('No image data from camera');
      }

      // Store the captured image data for display and potential retry
      setCapturedImageUri(result.assets[0].uri);
      setCapturedImageBase64(result.assets[0].base64);

      // Show processing state
      setState('processing');

      // Save compressed image to permanent storage
      const savedUri = await saveCompressedScan(result.assets[0].uri);
      setSavedImageUri(savedUri);

      // Scan the image
      const scanResult = await scanImage(result.assets[0].base64);

      console.log('========================================');
      console.log('CAMERA - SCAN RESULT RECEIVED:');
      console.log('Dish Title:', scanResult.dishTitle);
      console.log(
        'Ingredients:',
        (scanResult.ingredientsList || []).map((ingredient) => ingredient.name),
      );
      console.log('Totals:', scanResult.totals);
      console.log('========================================');

      // Cache scan result with image URI and timestamp
      setCachedScan(
        'latest',
        JSON.stringify({
          ...scanResult,
          imageUri: savedUri,
          timestamp: Date.now(),
        })
      );

      track('scan_completed', {
        items_count: (scanResult.ingredientsList || []).length,
        scan_confidence: scanResult.confidence,
      });

      router.replace('/scan-result');
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
    if (!capturedImageBase64 || !savedImageUri) {
      // If we don't have cached data, launch camera again
      launchCamera();
      return;
    }

    try {
      setError(null);
      setState('processing');

      // Retry scanning with the same image
      const scanResult = await scanImage(capturedImageBase64);

      // Cache the result
      setCachedScan(
        'latest',
        JSON.stringify({
          ...scanResult,
          imageUri: savedImageUri,
          timestamp: Date.now(),
        })
      );

      track('scan_retry_success', {
        items_count: (scanResult.ingredientsList || []).length,
      });

      router.replace('/scan-result');
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
              <Ionicons name="restaurant" size={64} color={theme.colors.primary[500]} />
            </View>
          )}
          <ActivityIndicator size="large" color={theme.colors.primary[500]} style={styles.spinner} />
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
            <Ionicons name="camera-off" size={64} color={theme.colors.error} />
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
            <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
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
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingTitle}>Opening camera...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.primary[50],
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
    borderColor: theme.colors.primary[200],
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
    color: theme.colors.ink[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: theme.colors.ink[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: theme.colors.ink[500],
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
    borderColor: theme.colors.error + '40',
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
    backgroundColor: theme.colors.primary[500],
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
    backgroundColor: theme.colors.ink[100],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink[700],
  },
  button: {
    backgroundColor: theme.colors.primary[500],
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
