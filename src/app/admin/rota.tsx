import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { monthGrid, toISO } from '@/lib/calendarGrid';
import { SHIFT_TEMPLATES, templateLabel, type ShiftTemplate } from '@/lib/shiftTemplates';
import { useRotaWeek, type ShiftWithAssignments } from '@/hooks/useRotaWeek';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function RotaScreen() {
  const { shifts, staff, loading, assignShift, removeAssignment, publishWeek, copyPreviousPeriod } = useRotaWeek();

  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(() => toISO(new Date()));
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, ShiftWithAssignments[]> = {};
    for (const s of shifts) {
      (map[s.shift_date] ??= []).push(s);
    }
    return map;
  }, [shifts]);

  const gridDays = useMemo(() => monthGrid(anchor), [anchor]);
  const currentMonth = anchor.getMonth();
  const today = toISO(new Date());

  function stepMonth(direction: 1 | -1) {
    setAnchor((cur) => new Date(cur.getFullYear(), cur.getMonth() + direction, 1));
  }

  function selectDay(iso: string) {
    setSelected((cur) => (cur === iso ? null : iso));
    setSelectedTemplate(null);
    setError(null);
  }

  async function handleAssign(staffId: string | undefined) {
    if (!selected || !selectedTemplate) return;
    setBusy(true);
    setError(null);
    const { error: assignError } = await assignShift({ shift_date: selected, template: selectedTemplate, staffId });
    setBusy(false);
    if (assignError) {
      setError(assignError);
      return;
    }
    setSelectedTemplate(null);
  }

  async function handlePublish() {
    setPublishMsg(null);
    const { error: publishError } = await publishWeek();
    setPublishMsg(publishError ?? 'Assigned.');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  const selectedShifts = selected ? shiftsByDate[selected] ?? [] : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rota</Text>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={copyPreviousPeriod}
            style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.smallButtonText}>Copy Previous Period</Text>
          </Pressable>
          <Pressable
            onPress={handlePublish}
            style={({ pressed }) => [styles.publishButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.publishButtonText}>Assign</Text>
          </Pressable>
        </View>
        {publishMsg && <Text style={styles.publishMsg}>{publishMsg}</Text>}

        <View style={styles.navRow}>
          <Pressable onPress={() => stepMonth(-1)} hitSlop={8} style={styles.navButton}>
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <Text style={styles.periodLabel}>{anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
          <Pressable onPress={() => stepMonth(1)} hitSlop={8} style={styles.navButton}>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {gridDays.map((date) => {
            const iso = toISO(date);
            const dayShifts = shiftsByDate[iso] ?? [];
            const isToday = iso === today;
            const isSelected = iso === selected;
            const dimmed = date.getMonth() !== currentMonth;

            return (
              <Pressable key={iso} onPress={() => selectDay(iso)} style={[styles.monthCell, isSelected && styles.cellSelected]}>
                <Text style={[styles.dateNumber, isToday && styles.dateNumberToday, dimmed && styles.dateNumberDimmed]}>
                  {date.getDate()}
                </Text>
                <View style={styles.dotRow}>
                  {dayShifts.slice(0, 4).map((s) => (
                    <View key={s.id} style={[styles.dot, s.published_at ? styles.dotPublished : styles.dotDraft]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {selected && (
          <View style={styles.dayPanel}>
            <Text style={styles.dayPanelTitle}>
              {new Date(`${selected}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>

            {selectedShifts.length > 0 && (
              <View style={styles.existingList}>
                {selectedShifts.map((s) => (
                  <View key={s.id} style={styles.existingRow}>
                    <View style={styles.existingInfo}>
                      <Text style={styles.existingTime}>
                        {formatTime(s.start_time)} – {formatTime(s.end_time)} · {s.role}
                      </Text>
                      <Text style={styles.existingBadge}>{s.published_at ? 'Published' : 'Draft'}</Text>
                    </View>
                    {s.assignments.length === 0 ? (
                      <Text style={styles.existingStaff}>Unassigned</Text>
                    ) : (
                      s.assignments.map((a) => (
                        <View key={a.id} style={styles.assignmentRow}>
                          <Text style={styles.existingStaff}>{a.profile?.full_name ?? 'Open shift'}</Text>
                          <Pressable onPress={() => removeAssignment(a.id)} hitSlop={8} style={styles.removeTouch}>
                            <Text style={styles.removeText}>Remove</Text>
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                ))}
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.assignColumns}>
              <View style={styles.column}>
                <Text style={styles.columnHeading}>Possible shifts</Text>
                {SHIFT_TEMPLATES.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedTemplate(t)}
                    style={[styles.templateRow, selectedTemplate?.id === t.id && styles.templateRowActive]}
                  >
                    <Text style={[styles.templateClub, selectedTemplate?.id === t.id && styles.templateTextActive]}>{t.club}</Text>
                    <Text style={[styles.templateTime, selectedTemplate?.id === t.id && styles.templateTextActive]}>
                      {templateLabel(t)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.column}>
                <Text style={styles.columnHeading}>Staff</Text>
                {staff.some((s) => s.is_permanent) && (
                  <Text style={styles.permanentHint}>🔁 = permanent, repeats weekly for the month</Text>
                )}
                <Pressable
                  onPress={() => handleAssign(undefined)}
                  disabled={!selectedTemplate || busy}
                  style={[styles.staffRow, !selectedTemplate && styles.staffRowDisabled]}
                >
                  <Text style={styles.staffRowText}>Open shift</Text>
                </Pressable>
                {staff.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => handleAssign(s.id)}
                    disabled={!selectedTemplate || busy}
                    style={[styles.staffRow, !selectedTemplate && styles.staffRowDisabled]}
                  >
                    <Text style={styles.staffRowText}>
                      {s.full_name}
                      {s.is_permanent ? ' 🔁' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { ...type.h2, color: colors.ink, marginBottom: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  smallButton: {
    minHeight: minTapTarget,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { ...type.small, color: colors.ink, fontWeight: '700' },
  publishButton: {
    minHeight: minTapTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  publishButtonText: { ...type.small, color: colors.white, fontWeight: '700' },
  publishMsg: { ...type.small, color: colors.success },
  buttonPressed: { opacity: 0.8 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  navButton: { minWidth: minTapTarget, minHeight: minTapTarget, alignItems: 'center', justifyContent: 'center' },
  navArrow: { ...type.h2, color: colors.navy },
  periodLabel: { ...type.bodyBold, color: colors.ink },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', ...type.label, color: colors.subtle },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: {
    width: `${100 / 7}%`,
    minHeight: minTapTarget + 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  cellSelected: { backgroundColor: colors.skyTint, borderRadius: radii.sm },
  dateNumber: { ...type.body, color: colors.ink },
  dateNumberToday: { color: colors.blue, fontWeight: '700' },
  dateNumberDimmed: { color: colors.subtle },
  dotRow: { flexDirection: 'row', gap: 2, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotPublished: { backgroundColor: colors.success },
  dotDraft: { backgroundColor: colors.warning },
  dayPanel: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dayPanelTitle: { ...type.bodyBold, color: colors.ink },
  existingList: { gap: spacing.xs },
  existingRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    gap: 2,
  },
  existingInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  existingTime: { ...type.small, color: colors.navy, fontWeight: '700' },
  existingBadge: { ...type.small, color: colors.muted },
  assignmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  existingStaff: { ...type.small, color: colors.muted },
  removeTouch: { minHeight: minTapTarget, justifyContent: 'center' },
  removeText: { ...type.small, color: colors.danger, fontWeight: '700' },
  error: { ...type.small, color: colors.danger },
  assignColumns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  column: { flex: 1, gap: spacing.xs },
  columnHeading: { ...type.label, color: colors.muted, marginBottom: spacing.xs },
  permanentHint: { ...type.small, color: colors.muted, marginBottom: spacing.xs },
  templateRow: {
    minHeight: minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  templateRowActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  templateClub: { ...type.small, color: colors.ink, fontWeight: '700' },
  templateTime: { ...type.small, color: colors.muted },
  templateTextActive: { color: colors.white },
  staffRow: {
    minHeight: minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  staffRowDisabled: { opacity: 0.4 },
  staffRowText: { ...type.small, color: colors.ink },
});
