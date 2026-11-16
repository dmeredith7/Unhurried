/**
 * Recurring task logic. Pure functions on YYYY-MM-DD strings so they are
 * easy to test and independent of storage.
 */
import type { Recurrence } from '../data/types';
import { addDays, daysBetween, parseISODate, toISODate } from '../lib/dates';

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Add months, aiming for `day` and clamping to the month's length. */
function addMonths(iso: string, n: number, day: number): string {
  const d = parseISODate(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const target = new Date(y, m, 1);
  const clamped = Math.min(day, daysInMonth(target.getFullYear(), target.getMonth()));
  return toISODate(new Date(target.getFullYear(), target.getMonth(), clamped));
}

function startOfWeek(iso: string): string {
  // Weeks start on Sunday for interval counting; weekday membership is
  // what users see, so the choice only matters for "every N weeks".
  return addDays(iso, -parseISODate(iso).getDay());
}

/** The single next occurrence strictly after `base`. */
export function stepAfter(rule: Recurrence, base: string): string {
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  switch (rule.freq) {
    case 'daily':
      return addDays(base, interval);
    case 'weekly': {
      const days = rule.weekdays?.length ? rule.weekdays : null;
      if (!days) return addDays(base, 7 * interval);
      const baseWeek = startOfWeek(base);
      for (let i = 1; i <= 7 * interval + 7; i++) {
        const d = addDays(base, i);
        const weekIndex = daysBetween(baseWeek, startOfWeek(d)) / 7;
        if (weekIndex % interval === 0 && days.includes(parseISODate(d).getDay())) return d;
      }
      return addDays(base, 7 * interval); // unreachable with valid weekdays
    }
    case 'monthly': {
      const day = rule.dayOfMonth ?? parseISODate(base).getDate();
      return addMonths(base, interval, day);
    }
  }
}

/**
 * When a recurring task is completed, the date of the next occurrence.
 *
 * - `from: 'completion'` counts from the day it was finished.
 * - `from: 'due'` keeps the original rhythm, but skips ahead past
 *   occurrences that are already behind us, so finishing late never leaves
 *   a pile of catch-up copies.
 */
export function nextOccurrence(
  rule: Recurrence,
  opts: { dueDate?: string | null; completedOn: string },
): string {
  const { dueDate, completedOn } = opts;
  if (rule.from === 'completion' || !dueDate) return stepAfter(rule, completedOn);
  let next = stepAfter(rule, dueDate);
  let guard = 0;
  while (next <= completedOn && guard++ < 1000) next = stepAfter(rule, next);
  return next;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Short human description, e.g. "Every 2 weeks on Mon, Thu". */
export function describeRecurrence(rule: Recurrence): string {
  const n = Math.max(1, rule.interval || 1);
  const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[rule.freq];
  let text =
    n === 1
      ? { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[rule.freq]
      : `Every ${n} ${unit}s`;
  if (rule.freq === 'weekly' && rule.weekdays?.length) {
    const sorted = [...rule.weekdays].sort((a, b) => a - b);
    text += ' on ' + sorted.map((d) => WEEKDAY_SHORT[d]).join(', ');
  }
  return text;
}
