/**
 * Reverse-calendar planning: work backward from a deadline to milestones,
 * and re-flow the plan kindly when something slips.
 */
import { addDays, daysBetween } from '../lib/dates';

/**
 * Evenly spaced target dates for `count` milestones between today and the
 * deadline, in chronological order. The last one lands on the deadline.
 */
export function suggestDates(today: string, deadline: string, count: number): string[] {
  if (count <= 0) return [];
  const span = Math.max(0, daysBetween(today, deadline));
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    let d = addDays(today, Math.round((span * i) / count));
    const prev = out[out.length - 1];
    if (prev && d <= prev && prev < deadline) d = addDays(prev, 1);
    out.push(d > deadline ? deadline : d);
  }
  return out;
}

export interface DatedItem {
  id: string;
  date: string;
}

export interface Reflow {
  dates: Record<string, string>;
  deadline: string;
}

/** Items after `id` in chronological order (stable for equal dates). */
function laterThan(items: DatedItem[], id: string): DatedItem[] {
  const idx = items.findIndex((i) => i.id === id);
  return idx === -1 ? [] : items.slice(idx + 1);
}

export function sortByDate<T extends DatedItem>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

/**
 * Option 1: push everything after the slipped milestone back by the same
 * amount. The deadline moves too if the plan now runs past it.
 */
export function reflowPush(items: DatedItem[], id: string, newDate: string, deadline: string): Reflow {
  const sorted = sortByDate(items);
  const old = sorted.find((i) => i.id === id);
  if (!old) return { dates: {}, deadline };
  const delta = daysBetween(old.date, newDate);
  const dates: Record<string, string> = { [id]: newDate };
  let last = newDate;
  for (const i of laterThan(sorted, id)) {
    dates[i.id] = addDays(i.date, Math.max(0, delta));
    if (dates[i.id] > last) last = dates[i.id];
  }
  return { dates, deadline: last > deadline ? last : deadline };
}

/**
 * Option 2: keep the deadline and spread the remaining milestones evenly
 * between the new date and the deadline. Returns null if the new date is
 * already past the deadline (then only pushing makes sense).
 */
export function reflowKeepDeadline(
  items: DatedItem[],
  id: string,
  newDate: string,
  deadline: string,
): Reflow | null {
  if (newDate > deadline) return null;
  const sorted = sortByDate(items);
  const later = laterThan(sorted, id);
  const dates: Record<string, string> = { [id]: newDate };
  const spread = suggestDates(newDate, deadline, later.length);
  later.forEach((i, n) => (dates[i.id] = spread[n]));
  return { dates, deadline };
}

/** Does moving this milestone to `newDate` affect anything after it? */
export function needsReflow(items: DatedItem[], id: string, newDate: string): boolean {
  const sorted = sortByDate(items);
  const old = sorted.find((i) => i.id === id);
  if (!old || newDate <= old.date) return false;
  return laterThan(sorted, id).length > 0;
}

export interface ProgressInput {
  kind: 'milestone' | 'step' | 'task';
  id: string;
  parentId?: string | null;
  done: boolean;
}

/**
 * Progress through a goal. Steps are the units of work; a milestone with
 * no steps counts as one unit itself.
 */
export function goalProgress(items: ProgressInput[]): { done: number; total: number; ratio: number } {
  const milestones = items.filter((i) => i.kind === 'milestone');
  const steps = items.filter((i) => i.kind !== 'milestone');
  const withSteps = new Set(steps.map((s) => s.parentId));
  const units = [...steps, ...milestones.filter((m) => !withSteps.has(m.id))];
  const done = units.filter((u) => u.done).length;
  return { done, total: units.length, ratio: units.length ? done / units.length : 0 };
}
