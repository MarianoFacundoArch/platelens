import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TextMealModal } from '@/components/TextMealModal';
import { formatLocalDateISO } from '@/lib/dateUtils';
import type { ScanResponse } from '@/lib/scan';

export default function TextEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [visible, setVisible] = useState(true);

  // Get date from params or use today
  const dateISO = (params.dateISO as string) || formatLocalDateISO(new Date());

  const handleClose = () => {
    setVisible(false);
    // Small delay to let modal animation complete
    setTimeout(() => {
      router.back();
    }, 200);
  };

  const handleAnalyzed = (scanResponse: ScanResponse) => {
    // Navigate to scan result screen
    router.replace({
      pathname: '/scan-result',
      params: {
        scanResponse: JSON.stringify(scanResponse),
        dateISO,
      },
    });
  };

  return (
    <View style={styles.container}>
      <TextMealModal
        visible={visible}
        onClose={handleClose}
        onAnalyzed={handleAnalyzed}
        dateISO={dateISO}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
