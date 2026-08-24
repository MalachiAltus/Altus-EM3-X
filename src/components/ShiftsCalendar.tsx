import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthGrid, toISO, weekGrid } from '@/lib/calendarGrid';
import { addDays } from '@/lib/engine/dates';
import type { CalendarShift } from '@/hooks/useShiftsCalendar';
import type { ColleagueOption, SwapRequestWithShift } from '@/hooks/useSwapRequests';
import { colors, minTapTarget, radii, spacing, type } from '@/theme/tokens';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function summarize(entries: CalendarShift[]): { hasMine: boolean; hasOpen: boolean } {
  return {
    hasMine: entries.some((e) => e.mine),
    hasOpen: entries.some((e) => e.openSpots > 0),
  };
}

interface ShiftsCalendarProps {
  shiftsByDate: Record<string, CalendarShift[]>;
  outgoing: SwapRequestWithShift[];
  colleagues: ColleagueOption[];
  onRequestSwap: (assignmentId: string, colleagueId: string) => void;
}

export function ShiftsCalendar({ shiftsByDate, outgoing, colleagues, onRequestSwap }: ShiftsCalendarProps) {
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toISO(new Date()));
  const [swapPickerFor, setSwapPickerFor] = useState<string | null>(null);

  const gridDays = useMemo(() => (mode === 'week' ? weekGrid(anchor) : monthGrid(anchor)), [mode, anchor]);

  const periodLabel = useMemo(() => {
    if (mode === 'week') {
      const start = gridDays[0];
      const end = gridDays[6];
      const sameMonth = start.getMonth() === end.getMonth();
      const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
      const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `${startLabel} – ${endLabel}`;
    }
    return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [mode, gridDays, anchor]);

  function step(direction: 1 | -1) {
    setAnchor((cur) => (mode === 'week' ? addDays(cur, direction * 7) : new Date(cur.getFullYear(), cur.getMonth() + direction, 1)));
  }

  const today = toISO(new Date());
  const selectedEntries = shiftsByDate[selected] ?? [];
  const currentMonth = anchor.getMonth();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Shifts</Text>
        <View style={styles.segmentRow}>
          {(['week', 'month'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.segment, mode === m && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                {m === 'week' ? 'Week' : 'Month'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={() => step(-1)} hitSlop={8} style={styles.navButton}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.periodLabel}>{periodLabel}</Text>
        <Pressable onPress={() => step(1)} hitSlop={8} style={styles.navButton}>
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
          const entries = shiftsByDate[iso] ?? [];
          const { hasMine, hasOpen } = summarize(entries);
          const isToday = iso === today;
          const isSelected = iso === selected;
          const dimmed = mode === 'month' && date.getMonth() !== currentMonth;

          return (
            <Pressable
              key={iso}
              onPress={() => {
                setSelected(iso);
                setSwapPickerFor(null);
              }}
              style={[
                mode === 'week' ? styles.weekCell : styles.monthCell,
                isSelected && styles.cellSelected,
              ]}
            >
              <Text style={[styles.dateNumber, isToday && styles.dateNumberToday, dimmed && styles.dateNumberDimmed]}>
                {date.getDate()}
              </Text>
              <View style={styles.dotRow}>
                {hasMine && <View style={[styles.dot, styles.dotMine]} />}
                {hasOpen && <View style={[styles.dot, styles.dotOpen]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotMine]} />
          <Text style={styles.legendText}>Assigned to you</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotOpen]} />
          <Text style={styles.legendText}>Open shift</Text>
        </View>
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.detailDate}>
          {new Date(`${selected}T00:00:00`).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        {selectedEntries.length === 0 ? (
          <Text style={styles.emptyText}>No published shifts this day.</Text>
        ) : (
          selectedEntries.map((entry) => {
            const existingSwap = entry.myAssignmentId
              ? outgoing.find((s) => s.assignment_id === entry.myAssignmentId)
              : undefined;

            return (
              <View key={entry.id} style={styles.detailRow}>
                <Text style={styles.detailTime}>
                  {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                </Text>
                <Text style={styles.detailRole}>{entry.role ?? 'Playworker'}</Text>

                <View style={styles.staffList}>
                  {entry.assignedStaff.length === 0 && entry.openSpots === 0 && (
                    <Text style={styles.detailStatusFull}>Unassigned</Text>
                  )}
                  {entry.assignedStaff.map((a) => (
                    <Text key={a.id} style={a.isMe ? styles.detailStatusMine : styles.detailStaffName}>
                      {a.isMe ? 'You' : a.staffName ?? 'Staff member'}
                    </Text>
                  ))}
                  {entry.openSpots > 0 && (
                    <Text style={styles.detailStatusOpen}>
                      {entry.openSpots} open spot{entry.openSpots > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>

                {entry.mine && entry.myAssignmentId && (
                  existingSwap ? (
                    <Text style={styles.swapStatus}>Swap {existingSwap.status.replace('_', ' ')}</Text>
                  ) : (
                    <Pressable
                      onPress={() => setSwapPickerFor((cur) => (cur === entry.myAssignmentId ? null : entry.myAssignmentId))}
                      hitSlop={8}
                      style={styles.swapLinkTouch}
                    >
                      <Text style={styles.swapLink}>Request Swap</Text>
                    </Pressable>
                  )
                )}

                {entry.mine && swapPickerFor === entry.myAssignmentId && !existingSwap && (
                  <View style={styles.picker}>
                    {colleagues.length === 0 ? (
                      <Text style={styles.emptyText}>No other active staff to swap with.</Text>
                    ) : (
                      colleagues.map((c) => (
                        <Pressable
                          key={c.id}
                          style={styles.pickerRow}
                          onPress={() => {
                            onRequestSwap(entry.myAssignmentId!, c.id);
                            setSwapPickerFor(null);
                          }}
                        >
                          <Text style={styles.pickerRowText}>{c.full_name}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.h3, color: colors.ink },
  segmentRow: { flexDirection: 'row', gap: spacing.xs },
  segment: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  segmentText: { ...type.small, color: colors.muted, fontWeight: '600' },
  segmentTextActive: { color: colors.white },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: { minWidth: minTapTarget, minHeight: minTapTarget, alignItems: 'center', justifyContent: 'center' },
  navArrow: { ...type.h2, color: colors.navy },
  periodLabel: { ...type.bodyBold, color: colors.ink },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', ...type.label, color: colors.subtle },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekCell: {
    width: `${100 / 7}%`,
    minHeight: minTapTarget + 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  monthCell: {
    width: `${100 / 7}%`,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  cellSelected: { backgroundColor: colors.skyTint, borderRadius: radii.sm },
  dateNumber: { ...type.body, color: colors.ink },
  dateNumberToday: { color: colors.blue, fontWeight: '700' },
  dateNumberDimmed: { color: colors.subtle },
  dotRow: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotMine: { backgroundColor: colors.navy },
  dotOpen: { backgroundColor: colors.blue },
  legendRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendText: { ...type.small, color: colors.muted },
  detailPanel: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailDate: { ...type.bodyBold, color: colors.ink },
  emptyText: { ...type.small, color: colors.muted },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 2,
  },
  detailTime: { ...type.bodyBold, color: colors.navy },
  detailRole: { ...type.small, color: colors.muted },
  staffList: { gap: 2 },
  detailStaffName: { ...type.small, color: colors.ink },
  detailStatusMine: { ...type.small, color: colors.navy, fontWeight: '600' },
  detailStatusOpen: { ...type.small, color: colors.blue, fontWeight: '600' },
  detailStatusFull: { ...type.small, color: colors.subtle },
  swapLink: { ...type.small, color: colors.blue, fontWeight: '700' },
  swapLinkTouch: { minHeight: minTapTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  swapStatus: { ...type.small, color: colors.muted, textTransform: 'capitalize' },
  picker: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  pickerRow: { minHeight: minTapTarget, justifyContent: 'center' },
  pickerRowText: { ...type.body, color: colors.ink },
});
