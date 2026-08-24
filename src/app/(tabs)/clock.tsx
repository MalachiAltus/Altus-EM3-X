import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useClockStatus } from '@/hooks/useClockStatus';
import { useTodayShift } from '@/hooks/useTodayShift';
import { supabase } from '@/lib/supabase/client';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

function formatShiftTime(time: string): string {
  return time.slice(0, 5);
}

function useElapsed(sinceISO?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!sinceISO) return '';
  const ms = now - new Date(sinceISO).getTime();
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
}

export default function ClockScreen() {
  const { lastEvent, isClockedIn, loading, refresh } = useClockStatus();
  const {
    shift: todayShift,
    hasTimesheet: todayShiftLogged,
    loading: todayShiftLoading,
    logMissedShift,
  } = useTodayShift();
  const [submitting, setSubmitting] = useState(false);
  const [loggingMissed, setLoggingMissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missedShiftError, setMissedShiftError] = useState<string | null>(null);
  const [missedShiftLogged, setMissedShiftLogged] = useState(false);
  const elapsed = useElapsed(isClockedIn ? lastEvent?.occurred_at : undefined);

  async function handleLogMissedShift() {
    setMissedShiftError(null);
    setLoggingMissed(true);
    const { error: logError } = await logMissedShift();
    setLoggingMissed(false);
    if (logError) {
      setMissedShiftError(logError);
      return;
    }
    setMissedShiftLogged(true);
  }

  async function handleClockIn() {
    setError(null);
    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc('clock_in', { p_device_info: Platform.OS });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    refresh();
  }

  async function handleClockOut() {
    setSubmitting(true);
    await supabase.rpc('clock_out', { p_device_info: Platform.OS });
    setSubmitting(false);
    refresh();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.shiftBox}>
        <Text style={styles.shiftLabel}>Today&apos;s shift</Text>
        {todayShiftLoading ? (
          <ActivityIndicator color={colors.navy} />
        ) : (
          <Text style={styles.shiftValue}>
            {todayShift
              ? `${formatShiftTime(todayShift.start_time)} – ${formatShiftTime(todayShift.end_time)}${
                  todayShift.role ? ` · ${todayShift.role}` : ''
                }`
              : 'N/A'}
          </Text>
        )}
      </View>

      {isClockedIn && lastEvent ? (
        <View style={styles.centeredContent}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.title}>Clocked in at {formatClockTime(lastEvent.occurred_at)}</Text>
          <View style={styles.elapsedBox}>
            <Text style={styles.elapsedLabel}>On shift</Text>
            <Text style={styles.elapsedValue}>{elapsed}</Text>
          </View>
          <Pressable
            onPress={handleClockOut}
            disabled={submitting}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Clock Out</Text>}
          </Pressable>
        </View>
      ) : (
        <View style={styles.centeredContent}>
          <Text style={styles.title}>Ready to clock in</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            onPress={handleClockIn}
            disabled={submitting}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Clock In</Text>}
          </Pressable>

          {todayShift && !todayShiftLogged && !missedShiftLogged && (
            <Pressable
              onPress={handleLogMissedShift}
              disabled={loggingMissed}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            >
              {loggingMissed ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Text style={styles.secondaryButtonText}>Forgot to clock in? Log today&apos;s shift hours</Text>
              )}
            </Pressable>
          )}
          {missedShiftLogged && <Text style={styles.confirmText}>Shift hours logged — your manager can see this.</Text>}
          {missedShiftError && <Text style={styles.error}>{missedShiftError}</Text>}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  shiftBox: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  shiftLabel: { ...type.small, color: colors.muted },
  shiftValue: { ...type.bodyBold, color: colors.ink },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.success, fontSize: 28, fontWeight: '700' },
  title: { ...type.h3, color: colors.ink, textAlign: 'center' },
  elapsedBox: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  elapsedLabel: { color: colors.skyTint, ...type.small },
  elapsedValue: { color: colors.white, ...type.h2 },
  error: { ...type.small, color: colors.danger },
  button: {
    minHeight: minTapTarget,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonPressed: { backgroundColor: colors.blueDark },
  buttonText: { color: colors.white, ...type.bodyBold },
  secondaryButton: {
    minHeight: minTapTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonPressed: { backgroundColor: colors.border },
  secondaryButtonText: { color: colors.navy, ...type.bodyBold, textAlign: 'center' },
  confirmText: { ...type.small, color: colors.success, textAlign: 'center' },
});
