import { describe, expect, it } from 'vitest';
import type { Task, WorkBlock } from '../data/types';
import {
  averageQuality,
  bestTimeOfDay,
  completedInWeek,
  focusByDay,
  focusByWeek,
  formatDuration,
  qualityCounts,
} from './stats';

const base = { createdAt: 0, updatedAt: 0, deletedAt: null };
const block = (start: string, minutes: number, quality: number): WorkBlock => ({
  ...base, id: start, startedAt: new Date(start).getTime(), endedAt: 0, plannedMinutes: 30,
  actualMinutes: minutes, quality, note: '', warmUp: false,
});

// Week of Monday 2026-11-16
const blocks = [
  block('2026-11-16T09:00:00', 30, 5),
  block('2026-11-16T10:00:00', 30, 4),
  block('2026-11-18T15:00:00', 25, 2),
  block('2026-11-18T16:00:00', 30, 3),
  block('2026-11-09T09:00:00', 30, 4), // previous week
];

describe('stats', () => {
  it('sums focus per day of the week', () => {
    const days = focusByDay(blocks, '2026-11-16');
    expect(days.map((d) => d.minutes)).toEqual([60, 0, 55, 0, 0, 0, 0]);
    expect(days[2].blocks).toBe(2);
  });

  it('sums focus per week, oldest first, ending with the chosen week', () => {
    const weeks = focusByWeek(blocks, '2026-11-16', 3);
    expect(weeks).toEqual([
      { weekStart: '2026-11-02', minutes: 0 },
      { weekStart: '2026-11-09', minutes: 30 },
      { weekStart: '2026-11-16', minutes: 115 },
    ]);
  });

  it('counts and averages quality', () => {
    expect(qualityCounts(blocks)).toEqual([0, 1, 1, 2, 1]);
    expect(averageQuality(blocks.slice(0, 4))).toBe(3.5);
    expect(averageQuality([])).toBeNull();
  });

  it('only names a best time of day when the data clearly supports it', () => {
    expect(bestTimeOfDay(blocks)).toEqual({ part: 'morning', average: 13 / 3 });
    expect(bestTimeOfDay(blocks.slice(0, 2))).toBeNull(); // one part of the day only
    const even = [block('2026-11-16T09:00:00', 30, 3), block('2026-11-16T10:00:00', 30, 3),
      block('2026-11-16T14:00:00', 30, 3), block('2026-11-16T15:00:00', 30, 3)];
    expect(bestTimeOfDay(even)).toBeNull(); // no clear winner
  });

  it('splits finished tasks from goal steps for the week', () => {
    const t = (id: string, kind: Task['kind'], completed: string | null): Task =>
      ({ ...base, id, kind, status: completed ? 'done' : 'open', completedAt: completed ? new Date(completed).getTime() : null } as Task);
    const r = completedInWeek(
      [t('a', 'task', '2026-11-17T12:00:00'), t('b', 'step', '2026-11-20T12:00:00'),
       t('c', 'task', '2026-11-10T12:00:00'), t('d', 'task', null)],
      '2026-11-16',
    );
    expect(r.tasks.map((x) => x.id)).toEqual(['a']);
    expect(r.steps.map((x) => x.id)).toEqual(['b']);
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(120)).toBe('2 h');
  });
});
