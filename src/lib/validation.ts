import { isPast, addMonths, isSameDay, parseISO, addHours, startOfDay } from 'date-fns';

// Minimum advance booking: 48 hours from now
// Privileged roles (Admin/Manager/Asst Manager) are exempt.
export function isWithin48Hours(date: string): boolean {
  const d = parseISO(date);
  const cutoff = startOfDay(addHours(new Date(), 48));
  return d < cutoff;
}

export function validateTimeRange(start: string) {
  const [h, m] = start.split(':').map(Number);
  const endH = h + 9;
  return endH <= 24; // Simple check for midnight crossing
}

export function calculateEndTime(start: string) {
  const [h, m] = start.split(':').map(Number);
  const endH = (h + 9).toString().padStart(2, '0');
  return `${endH}:${m.toString().padStart(2, '0')}`;
}

export function validateDateRange(date: string) {
  const d = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isPast(d) && !isSameDay(d, today)) return false;
  if (d > addMonths(today, 3)) return false;
  return true;
}

export function checkOverlap(
  existingStart: string, 
  existingEnd: string, 
  newStart: string, 
  newEnd: string
) {
  const s1 = parseInt(existingStart.replace(':', ''));
  const e1 = parseInt(existingEnd.replace(':', ''));
  const s2 = parseInt(newStart.replace(':', ''));
  const e2 = parseInt(newEnd.replace(':', ''));

  // Add 1-hour gap (100 in HHMM format)
  const gap = 100;
  
  return (s2 < e1 + gap && e2 > s1 - gap);
}

export function getMaxStations(office: string) {
  return office === 'Office #1' ? 15 : 30;
}
