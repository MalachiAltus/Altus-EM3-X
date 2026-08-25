import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QualificationEditor } from '@/components/QualificationEditor';
import { useStaffCompliance, type StaffComplianceRow } from '@/hooks/useStaffCompliance';
import { DEFAULT_STANDARD_DAY_HOURS } from '@/lib/engine/accrual';
import type { QualificationStatus } from '@/lib/engine/compliance';
import { colors, radii, spacing, type } from '@/theme/tokens';

const ROLE_LABEL: Record<string, string> = { staff: 'Playworker', manager: 'Manager', admin: 'Admin' };

function formatDob(dob: string | null): string {
  if (!dob) return 'Not set';
  return new Date(`${dob}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A "day" here is a standard 8-hour working day (same assumption the
// accrual engine uses), purely for a friendlier readout of large hour
// totals — it has no bearing on pay or accrual calculations.
function formatDaysHours(totalHours: number): string {
  const days = Math.floor(totalHours / DEFAULT_STANDARD_DAY_HOURS);
  const remainderHours = totalHours - days * DEFAULT_STANDARD_DAY_HOURS;
  let hours = Math.floor(remainderHours);
  let minutes = Math.round((remainderHours - hours) * 60);
  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }
  return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
}

const STATUS_STYLE: Record<QualificationStatus, { bg: string; fg: string; label: string }> = {
  valid: { bg: colors.successBg, fg: colors.success, label: 'Valid' },
  expiring: { bg: colors.warningBg, fg: colors.warning, label: 'Expiring' },
  expired: { bg: colors.dangerBg, fg: colors.danger, label: 'Expired' },
  missing: { bg: colors.border, fg: colors.muted, label: 'None' },
};

function Badge({ label, status }: { label: string; status: QualificationStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeLabel, { color: s.fg }]}>{label}</Text>
      <Text style={[styles.badgeStatus, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export default function StaffDirectoryScreen() {
  const { staff, loading, refresh } = useStaffCompliance();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Single Central Record</Text>
        {staff.map((s: StaffComplianceRow) => {
          const expanded = expandedId === s.id;
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{s.full_name}</Text>
                <Text style={styles.role}>{ROLE_LABEL[s.role]}</Text>
              </View>
              <View style={styles.badgeRow}>
                <Badge label="DBS" status={s.dbs} />
                <Badge label="Paed. FA" status={s.paediatricFirstAid} />
                <Badge label="First Aid" status={s.firstAid} />
                <Badge label="Safeguarding" status={s.safeguarding} />
              </View>
              <Pressable
                onPress={() => setExpandedId(expanded ? null : s.id)}
                hitSlop={8}
                style={styles.editToggleTouch}
              >
                <Text style={styles.editToggle}>{expanded ? '▲ Hide details' : '▼ Show details'}</Text>
              </Pressable>
              {expanded && (
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Hours worked</Text>
                      <Text style={styles.statValue}>{formatDaysHours(s.hoursWorked)}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Holiday hours allowed</Text>
                      <Text style={styles.statValue}>{formatDaysHours(s.holidayAllowed)}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Date of birth</Text>
                      <Text style={styles.statValue}>{formatDob(s.dob)}</Text>
                    </View>
                  </View>
                  <QualificationEditor staffId={s.id} qualifications={s.qualifications} onSaved={refresh} />
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...type.h2, color: colors.ink, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...type.bodyBold, color: colors.ink },
  role: { ...type.small, color: colors.muted },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: { borderRadius: radii.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minWidth: 80 },
  badgeLabel: { ...type.small, fontWeight: '700' },
  badgeStatus: { ...type.small },
  editToggleTouch: { alignSelf: 'flex-start', marginTop: spacing.xs },
  editToggle: { ...type.small, color: colors.blue, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.skyTint,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  statLabel: { ...type.small, color: colors.muted },
  statValue: { ...type.bodyBold, color: colors.navy },
});
