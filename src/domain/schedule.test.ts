import { describe, expect, it } from 'vitest';
import type { ScheduleOverride, ScheduleTemplateEntry, WorkBlock } from '../data/types';
import { layoutLanes, placeBlocks, resolveWeek, summarizeWeek, weekDates, weekStartFor } from './schedule';

const base = { createdAt: 0, updatedAt: 0, deletedAt: null };
const tpl = (id: string, weekday: number, startSlot: number, endSlot: number, kind: ScheduleTemplateEntry['kind'] = 'leisure'): ScheduleTemplateEntry => ({
  ...base, id, weekday, startSlot, endSlot, kind, label: id,
});
const ov = (o: Partial<ScheduleOverride> & { id: string; date: string }): ScheduleOverride => ({
  ...base, startSlot: 20, endSlot: 22, kind: 'leisure', label: o.id, ...o,
});

// 2026-11-16 is a Monday.
describe('weeks', () => {
  it('finds the start of the week for either setting', () => {
    expect(weekStartFor('2026-11-18', 1)).toBe('2026-11-16');
    expect(weekStartFor('2026-11-18', 0)).toBe('2026-11-15');
    expect(weekStartFor('2026-11-15', 1)).toBe('2026-11-09'); // Sunday belongs to the previous Mon-week
    expect(weekDates('2026-11-16')).toHaveLength(7);
  });
});

describe('resolveWeek', () => {
  const template = [tpl('gym', 3, 36, 38), tpl('sleep', 1, 0, 14, 'committed')];

  it('places weekly entries on the right dates', () => {
    const r = resolveWeek(template, [], '2026-11-16');
    expect(r.map((e) => `${e.label}@${e.date}`)).toEqual(['sleep@2026-11-16', 'gym@2026-11-18']);
  });

  it('applies "only this week" changes without touching other weeks', () => {
    const overrides = [
      ov({ id: 'moved', date: '2026-11-19', templateEntryId: 'gym', replacesDate: '2026-11-18', label: 'gym (moved)' }),
      ov({ id: 'off', date: '2026-11-16', templateEntryId: 'sleep', replacesDate: '2026-11-16', hidden: true }),
      ov({ id: 'party', date: '2026-11-21' }),
    ];
    const r = resolveWeek(template, overrides, '2026-11-16');
    expect(r.map((e) => `${e.label}@${e.date}`)).toEqual(['gym (moved)@2026-11-19', 'party@2026-11-21']);
    const next = resolveWeek(template, overrides, '2026-11-23');
    expect(next.map((e) => e.label)).toEqual(['sleep', 'gym']);
  });

  it('keeps overrides attached to dates when the week start changes', () => {
    const overrides = [ov({ id: 'party', date: '2026-11-22' })]; // a Sunday
    expect(resolveWeek([], overrides, weekStartFor('2026-11-22', 1)).map((e) => e.label)).toEqual(['party']);
    expect(resolveWeek([], overrides, weekStartFor('2026-11-22', 0)).map((e) => e.label)).toEqual(['party']);
  });
});

describe('blocks and summary', () => {
  const block = (id: string, start: string, minutes: number, spaceId: string | null, quality = 4): WorkBlock => ({
    ...base, id, spaceId, startedAt: new Date(start).getTime(), endedAt: 0, plannedMinutes: 30,
    actualMinutes: minutes, quality, note: '', warmUp: false,
  });

  it('places blocks by real start time and sums the week', () => {
    const blocks = [
      block('a', '2026-11-16T09:15:00', 30, 'work'),
      block('b', '2026-11-17T14:00:00', 25, 'home', 2),
      block('c', '2026-11-24T09:00:00', 30, 'work'), // next week
    ];
    const placed = placeBlocks(blocks, '2026-11-16');
    expect(placed.map((p) => [p.date, p.startMin, p.endMin])).toEqual([
      ['2026-11-16', 555, 585],
      ['2026-11-17', 840, 865],
    ]);
    const entries = resolveWeek([tpl('walk', 2, 34, 36), tpl('sleep', 2, 0, 14, 'committed')], [], '2026-11-16');
    const s = summarizeWeek(entries, placed);
    expect(s.focusMinutes).toBe(55);
    expect(s.blockCount).toBe(2);
    expect(s.averageQuality).toBe(3);
    expect(s.bySpace).toEqual([{ spaceId: 'work', minutes: 30 }, { spaceId: 'home', minutes: 25 }]);
    expect(s.leisureMinutes).toBe(60);
  });
});

describe('layoutLanes', () => {
  it('puts overlapping items side by side', () => {
    const r = layoutLanes([
      { id: 'a', start: 0, end: 4 },
      { id: 'b', start: 2, end: 6 },
      { id: 'c', start: 8, end: 10 },
    ]);
    const byId = Object.fromEntries(r.map((x) => [x.id, [x.lane, x.lanes]]));
    expect(byId).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] });
  });
});
