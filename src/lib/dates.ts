/** Date helpers. Calendar dates are local-time strings in YYYY-MM-DD form. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Parse YYYY-MM-DD as a local date (not UTC). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * A friendly, non-judgmental label for a due date. Past dates never say
 * "overdue"; the caller shows them as "still on your list".
 */
export function dueLabel(due: string, today: string = todayISO()): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  const d = parseISODate(due);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  const sameYear = d.getFullYear() === parseISODate(today).getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function isPast(due: string, today: string = todayISO()): boolean {
  return due < today;
}

export function friendlyToday(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
