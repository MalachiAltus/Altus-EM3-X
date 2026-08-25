import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuditLog } from '@/hooks/useAuditLog';
import { useReports } from '@/hooks/useReports';
import { BIRTHDAY_REMINDER_DAYS, useUpcomingBirthdays } from '@/hooks/useUpcomingBirthdays';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function formatBirthday(dob: string): string {
  return new Date(`${dob}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function birthdayLabel(daysAway: number): string {
  if (daysAway === 0) return 'Today!';
  if (daysAway === 1) return 'Tomorrow';
  return `In ${daysAway} days`;
}

async function exportCsv(csv: string) {
  const filename = `em3x-report-${new Date().toISOString().slice(0, 10)}.csv`;
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export report' });
  }
}

export default function ReportsScreen() {
  const { rows, loading: reportsLoading, toCsv } = useReports();
  const { entries, loading: logLoading } = useAuditLog(30);
  const { birthdays, loading: birthdaysLoading } = useUpcomingBirthdays();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Reports &amp; Payroll</Text>
          <Pressable
            onPress={() => exportCsv(toCsv())}
            style={({ pressed }) => [styles.exportButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </Pressable>
        </View>

        {reportsLoading ? (
          <ActivityIndicator color={colors.navy} />
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.name}>{r.full_name}</Text>
              <View style={styles.statRow}>
                <Stat label="Hours worked" value={r.hoursWorked.toString()} />
                <Stat label="Accrued" value={`${r.accrued}h`} />
                <Stat label="Taken" value={`${r.taken}h`} />
                <Stat label="Balance" value={`${r.balance}h`} />
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Upcoming Birthdays</Text>
        {birthdaysLoading ? (
          <ActivityIndicator color={colors.navy} />
        ) : birthdays.length === 0 ? (
          <Text style={styles.emptyText}>No birthdays in the next {BIRTHDAY_REMINDER_DAYS} days.</Text>
        ) : (
          birthdays.map((b) => (
            <View key={b.id} style={styles.birthdayRow}>
              <View>
                <Text style={styles.birthdayName}>{b.full_name}</Text>
                <Text style={styles.birthdayDate}>{formatBirthday(b.dob)}</Text>
              </View>
              <Text style={styles.birthdayBadge}>{birthdayLabel(b.daysAway)}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Audit Log</Text>
        {logLoading ? (
          <ActivityIndicator color={colors.navy} />
        ) : entries.length === 0 ? (
          <Text style={styles.emptyText}>No edits logged yet.</Text>
        ) : (
          entries.map((e) => (
            <View key={e.id} style={styles.logRow}>
              <Text style={styles.logHeader}>
                {e.actorName} · {e.entity} · {e.action}
              </Text>
              <Text style={styles.logTime}>{formatDateTime(e.created_at)}</Text>
              {e.before && e.after && (
                <Text style={styles.logDiff}>
                  {Object.keys(e.after as Record<string, unknown>)
                    .filter((k) => JSON.stringify((e.before as Record<string, unknown>)?.[k]) !== JSON.stringify((e.after as Record<string, unknown>)[k]))
                    .map((k) => `${k}: ${JSON.stringify((e.before as Record<string, unknown>)?.[k])} → ${JSON.stringify((e.after as Record<string, unknown>)[k])}`)
                    .join(', ')}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  title: { ...type.h2, color: colors.ink },
  exportButton: {
    minHeight: minTapTarget,
    backgroundColor: colors.navy,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  exportButtonText: { color: colors.white, ...type.bodyBold },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  name: { ...type.bodyBold, color: colors.ink },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...type.h3, color: colors.navy },
  statLabel: { ...type.small, color: colors.muted },
  sectionTitle: { ...type.h3, color: colors.ink, marginTop: spacing.md },
  emptyText: { ...type.body, color: colors.muted },
  birthdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.skyTint,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  birthdayName: { ...type.bodyBold, color: colors.navy },
  birthdayDate: { ...type.small, color: colors.muted },
  birthdayBadge: { ...type.small, fontWeight: '700', color: colors.navy },
  logRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  logHeader: { ...type.bodyBold, color: colors.ink, textTransform: 'capitalize' },
  logTime: { ...type.small, color: colors.muted },
  logDiff: { ...type.small, color: colors.navy },
});
