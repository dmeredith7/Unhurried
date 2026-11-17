/**
 * Numbers for the Progress dashboard. Everything here celebrates what was
 * done; nothing compares against a target or counts what wasn't.
 */
import type { Task, WorkBlock } from '../data/types';
import { addDays, parseISODate, toISODate } from '../lib/dates';
import { weekDates } from './schedule';

export interface DayFocus {
  date: string;
  minutes: number;
  blocks: number;
}

function dateOf(ms: number): string {
  return toISODate(new Date(ms));
}

export function focusByDay(blocks: WorkBlock[], weekStart: string): DayFocus[] {
  return weekDates(weekStart).map((date) => {
    const day = blocks.filter((b) => dateOf(b.startedAt) === date);
    return { date, minutes: day.reduce((n, b) => n + b.actualMinutes, 0), blocks: day.length };
  });
}

export interface WeekFocus {
  weekStart: string;
  minutes: number;
}

/** Focus minutes for the `count` weeks ending with the one starting `weekStart`. */
export function focusByWeek(blocks: WorkBlock[], weekStart: string, count = 8): WeekFocus[] {
  const starts = Array.from({ length: count }, (_, i) => addDays(weekStart, -7 * (count - 1 - i)));
  return starts.map((ws) => {
    const end = addDays(ws, 7);
    const minutes = blocks
      .filter((b) => {
        const d = dateOf(b.startedAt);
        return d >= ws && d < end;
      })
      .reduce((n, b) => n + b.actualMinutes, 0);
    return { weekStart: ws, minutes };
  });
}

/** How many blocks were rated 1..5. */
export function qualityCounts(blocks: WorkBlock[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const b of blocks) if (b.quality >= 1 && b.quality <= 5) counts[b.quality - 1]++;
  return counts;
}

export function averageQuality(blocks: WorkBlock[]): number | null {
  const rated = blocks.filter((b) => b.quality >= 1);
  return rated.length ? rated.reduce((n, b) => n + b.quality, 0) / rated.length : null;
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

function partOf(ms: number): DayPart {
  const h = new Date(ms).getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

/**
 * When focus tends to be best, from all logged blocks. Only answers when there
 * is enough data to say something honest: at least two parts of the day with
 * two or more blocks each, and a clear winner.
 */
export function bestTimeOfDay(blocks: WorkBlock[]): { part: DayPart; average: number } | null {
  const groups = new Map<DayPart, number[]>();
  for (const b of blocks) {
    if (b.quality < 1) continue;
    const p = partOf(b.startedAt);
    groups.set(p, [...(groups.get(p) ?? []), b.quality]);
  }
  const avgs = [...groups.entries()]
    .filter(([, q]) => q.length >= 2)
    .map(([part, q]) => ({ part, average: q.reduce((a, c) => a + c, 0) / q.length }))
    .sort((a, b) => b.average - a.average);
  if (avgs.length < 2 || avgs[0].average - avgs[1].average < 0.25) return null;
  return avgs[0];
}

export function inWeek(ms: number | null | undefined, weekStart: string): boolean {
  if (!ms) return false;
  const d = dateOf(ms);
  return d >= weekStart && d < addDays(weekStart, 7);
}

export function blocksInWeek(blocks: WorkBlock[], weekStart: string): WorkBlock[] {
  return blocks.filter((b) => inWeek(b.startedAt, weekStart));
}

export function completedInWeek(tasks: Task[], weekStart: string): { tasks: Task[]; steps: Task[] } {
  const done = tasks.filter((t) => t.status === 'done' && inWeek(t.completedAt, weekStart));
  return {
    tasks: done.filter((t) => t.kind === 'task'),
    steps: done.filter((t) => t.kind === 'step' || t.kind === 'milestone'),
  };
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function shortHours(min: number): string {
  if (min === 0) return '0';
  const h = min / 60;
  return h < 10 ? (Math.round(h * 10) / 10).toString() : Math.round(h).toString();
}

export function weekdayShort(date: string): string {
  return parseISODate(date).toLocaleDateString(undefined, { weekday: 'short' });
}
