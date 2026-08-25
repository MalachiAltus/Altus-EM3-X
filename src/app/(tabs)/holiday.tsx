import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateDropdown } from '@/components/DateDropdown';
import { useAbsenceRequests } from '@/hooks/useAbsenceRequests';
import { useHolidayBalance } from '@/hooks/useHolidayBalance';
import { formatHoursAsDaysHours } from '@/lib/engine/accrual';
import type { Tables } from '@/lib/supabase/types';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_STYLE: Record<Tables<'absence_requests'>['status'], { bg: string; fg: string }> = {
  pending: { bg: colors.warningBg, fg: colors.warning },
  approved: { bg: colors.successBg, fg: colors.success },
  declined: { bg: colors.dangerBg, fg: colors.danger },
  cancelled: { bg: colors.border, fg: colors.muted },
};

export default function HolidayScreen() {
  const { balance, allowed, loading: balanceLoading, refresh: refreshBalance } = useHolidayBalance();
  const { requests, loading: requestsLoading, submit, cancel } = useAbsenceRequests();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
      setError('Enter dates as YYYY-MM-DD.');
      return;
    }
    const hoursNum = Number(hours);
    if (!hours || Number.isNaN(hoursNum) || hoursNum <= 0) {
      setError('Enter how many hours this request covers.');
      return;
    }
    setSubmitting(true);
    const { error: submitError } = await submit({
      type: 'holiday',
      start_date: startDate,
      end_date: endDate,
      hours: hoursNum,
      reason,
    });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setStartDate('');
    setEndDate('');
    setHours('');
    setReason('');
    refreshBalance();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Request Time Off</Text>

        <Text style={styles.fieldLabel}>Start date</Text>
        <DateDropdown value={startDate} onChange={setStartDate} />

        <Text style={styles.fieldLabel}>End date</Text>
        <DateDropdown value={endDate} onChange={setEndDate} />

        <TextInput
          style={styles.input}
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          placeholder="Hours"
          placeholderTextColor={colors.subtle}
        />

        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="Anything your manager should know?"
          placeholderTextColor={colors.subtle}
        />

        <View style={styles.allowedBox}>
          {balanceLoading ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <>
              <Text style={styles.allowedText}>Holiday hours allowed: {formatHoursAsDaysHours(allowed)}</Text>
              <Text style={styles.allowedIcon}>☀️🏖️</Text>
            </>
          )}
        </View>

        <View style={styles.balanceBox}>
          {balanceLoading ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.balanceText}>
              You have {formatHoursAsDaysHours(balance)} banked
              {hours && !Number.isNaN(Number(hours)) ? ` — this request uses ${hours} hours.` : '.'}
            </Text>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </Pressable>

        <Text style={styles.sectionTitle}>Your requests</Text>
        {requestsLoading ? (
          <ActivityIndicator color={colors.navy} />
        ) : requests.length === 0 ? (
          <Text style={styles.emptyText}>No requests yet.</Text>
        ) : (
          requests.map((r) => (
            <View key={r.id} style={styles.requestRow}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestDates}>
                  {r.start_date} – {r.end_date}
                </Text>
                <Text style={styles.requestType}>{r.type} · {r.hours ?? 0}h</Text>
              </View>
              <View style={styles.requestRight}>
                <View style={[styles.badge, { backgroundColor: STATUS_STYLE[r.status].bg }]}>
                  <Text style={[styles.badgeText, { color: STATUS_STYLE[r.status].fg }]}>
                    {r.status}
                  </Text>
                </View>
                {r.status === 'pending' && (
                  <Pressable onPress={() => cancel(r.id)} hitSlop={8} style={styles.cancelLinkTouch}>
                    <Text style={styles.cancelLink}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { ...type.h3, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.xs },
  fieldLabel: { ...type.small, color: colors.muted, marginTop: spacing.xs },
  input: {
    minHeight: minTapTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 16,
  },
  allowedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  allowedText: { ...type.body, color: colors.ink },
  allowedIcon: { fontSize: 20 },
  balanceBox: {
    backgroundColor: colors.skyTint,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  balanceText: { ...type.body, color: colors.navy },
  error: { ...type.small, color: colors.danger },
  submitButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.blue,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonPressed: { backgroundColor: colors.blueDark },
  submitButtonText: { color: colors.white, ...type.bodyBold },
  emptyText: { ...type.body, color: colors.muted },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  requestInfo: { gap: 2 },
  requestDates: { ...type.bodyBold, color: colors.ink },
  requestType: { ...type.small, color: colors.muted, textTransform: 'capitalize' },
  requestRight: { alignItems: 'flex-end', gap: spacing.xs },
  badge: { paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  badgeText: { ...type.small, fontWeight: '700', textTransform: 'capitalize' },
  cancelLink: { ...type.small, color: colors.danger },
  cancelLinkTouch: { minHeight: minTapTarget, justifyContent: 'center' },
});
