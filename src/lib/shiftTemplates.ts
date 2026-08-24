// EM3's fixed set of shift slots — the club runs the same handful of time
// windows every day, so admins pick from this list rather than typing times
// freehand. Matches the club's own reference sheet exactly.
export interface ShiftTemplate {
  id: string;
  club: string;
  start_time: string;
  end_time: string;
}

export const SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: 'bc-1', club: 'Breakfast Club', start_time: '07:30:00', end_time: '09:00:00' },
  { id: 'bc-2', club: 'Breakfast Club', start_time: '07:30:00', end_time: '08:30:00' },
  { id: 'ac-1', club: 'Afterschool Club', start_time: '14:30:00', end_time: '18:30:00' },
  { id: 'ac-2', club: 'Afterschool Club', start_time: '15:00:00', end_time: '18:30:00' },
  { id: 'ac-3', club: 'Afterschool Club', start_time: '15:00:00', end_time: '18:00:00' },
  { id: 'ac-4', club: 'Afterschool Club', start_time: '15:00:00', end_time: '16:00:00' },
  { id: 'ac-5', club: 'Afterschool Club', start_time: '15:00:00', end_time: '17:00:00' },
];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function templateLabel(t: ShiftTemplate): string {
  return `${formatTime(t.start_time)} – ${formatTime(t.end_time)}`;
}
