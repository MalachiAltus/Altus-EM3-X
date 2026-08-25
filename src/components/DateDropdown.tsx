import { Picker } from '@react-native-picker/picker';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { toISODate } from '@/lib/engine/dates';
import { colors, radii } from '@/theme/tokens';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface Props {
  value: string;
  onChange: (iso: string) => void;
  /** ISO date to seed `value` with when empty. Defaults to today. */
  fallback?: string;
  /** [min, max] inclusive year range for the year picker. Defaults to today's year -1..+2. */
  yearRange?: [number, number];
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function DateDropdown({ value, onChange, fallback, yearRange }: Props) {
  const parsed = value ? value.split('-').map(Number) : null;
  const now = new Date();
  const seed = fallback ? fallback.split('-').map(Number) : null;
  const year = parsed?.[0] ?? seed?.[0] ?? now.getFullYear();
  const month = parsed?.[1] ?? seed?.[1] ?? now.getMonth() + 1;
  const day = parsed?.[2] ?? seed?.[2] ?? now.getDate();

  useEffect(() => {
    if (!value) onChange(fallback ?? toISODate(now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(next: { year?: number; month?: number; day?: number }) {
    const y = next.year ?? year;
    const m = next.month ?? month;
    const d = Math.min(next.day ?? day, daysInMonth(y, m));
    onChange(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const [minYear, maxYear] = yearRange ?? [now.getFullYear() - 1, now.getFullYear() + 2];
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  return (
    <View style={styles.row}>
      <View style={[styles.pickerWrap, styles.dayWrap]}>
        <Picker
          selectedValue={day}
          onValueChange={(v) => update({ day: Number(v) })}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {days.map((d) => (
            <Picker.Item key={d} label={String(d)} value={d} />
          ))}
        </Picker>
      </View>
      <View style={[styles.pickerWrap, styles.monthWrap]}>
        <Picker
          selectedValue={month}
          onValueChange={(v) => update({ month: Number(v) })}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {MONTHS.map((label, i) => (
            <Picker.Item key={label} label={label} value={i + 1} />
          ))}
        </Picker>
      </View>
      <View style={[styles.pickerWrap, styles.yearWrap]}>
        <Picker
          selectedValue={year}
          onValueChange={(v) => update({ year: Number(v) })}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {years.map((y) => (
            <Picker.Item key={y} label={String(y)} value={y} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({ ios: { height: 120 }, default: {} }),
  },
  dayWrap: { flex: 0.8 },
  monthWrap: { flex: 1 },
  yearWrap: { flex: 1 },
  picker: { color: colors.ink },
  pickerItem: { color: colors.ink, fontSize: 16 },
});
