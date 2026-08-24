import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShiftsCalendar } from '@/components/ShiftsCalendar';
import { useShiftsCalendar } from '@/hooks/useShiftsCalendar';
import { useSwapRequests } from '@/hooks/useSwapRequests';
import { colors, spacing } from '@/theme/tokens';

export default function ShiftsScreen() {
  const { shiftsByDate, loading, refresh } = useShiftsCalendar();
  const { outgoing, colleagues, requestSwap } = useSwapRequests();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        >
          <ShiftsCalendar
            shiftsByDate={shiftsByDate}
            outgoing={outgoing}
            colleagues={colleagues}
            onRequestSwap={requestSwap}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: spacing.lg },
});
