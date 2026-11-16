/**
 * The Unschedule: a week of 30-minute slots holding committed time, leisure
 * (planned first), optional tentative work plans, and the focus blocks that
 * were actually done.
 */
import type { ScheduleKind, ScheduleOverride, ScheduleTemplateEntry, WorkBlock } from '../data/types';
import { addDays, parseISODate, toISODate } from '../lib/dates';

export const SLOTS_PER_DAY = 48;

export function weekStartFor(date: string, weekStartsOn: 0 | 1): string {
  const day = parseISODate(date).getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export interface ResolvedEntry {
  key: string;
  date: string;
  startSlot: number;
  endSlot: number;
  kind: ScheduleKind;
  label: string;
  spaceId?: string | null;
  /** Set for occurrences of a weekly entry (possibly modified this week). */
  templateEntryId: string | null;
  /** Set when this occurrence comes from a one-week change. */
  overrideId: string | null;
}

/** Combine the weekly template with this week's changes. */
export function resolveWeek(
  template: ScheduleTemplateEntry[],
  overrides: ScheduleOverride[],
  weekStart: string,
): ResolvedEntry[] {
  const dates = weekDates(weekStart);
  const inWeek = new Set(dates);
  // A one-week change to a weekly entry covers that entry for the whole week,
  // even if the weekly entry has since moved to another day.
  const replaced = new Set(
    overrides
      .filter((o) => o.templateEntryId && o.replacesDate && inWeek.has(o.replacesDate))
      .map((o) => o.templateEntryId),
  );
  const out: ResolvedEntry[] = [];

  for (const e of template) {
    const date = dates.find((d) => parseISODate(d).getDay() === e.weekday);
    if (!date || replaced.has(e.id)) continue;
    out.push({
      key: `${e.id}@${date}`,
      date,
      startSlot: e.startSlot,
      endSlot: e.endSlot,
      kind: e.kind,
      label: e.label,
      spaceId: e.spaceId,
      templateEntryId: e.id,
      overrideId: null,
    });
  }
  for (const o of overrides) {
    if (o.hidden || !inWeek.has(o.date)) continue;
    out.push({
      key: o.id,
      date: o.date,
      startSlot: o.startSlot,
      endSlot: o.endSlot,
      kind: o.kind,
      label: o.label,
      spaceId: o.spaceId,
      templateEntryId: o.templateEntryId ?? null,
      overrideId: o.id,
    });
  }
  return out.sort((a, b) => (a.date === b.date ? a.startSlot - b.startSlot : a.date < b.date ? -1 : 1));
}

export interface PlacedBlock {
  block: WorkBlock;
  date: string;
  startMin: number; // minutes from midnight
  endMin: number;
}

/** Position logged blocks on the days of the week, clipped at midnight. */
export function placeBlocks(blocks: WorkBlock[], weekStart: string): PlacedBlock[] {
  const dates = new Set(weekDates(weekStart));
  const out: PlacedBlock[] = [];
  for (const b of blocks) {
    const start = new Date(b.startedAt);
    const date = toISODate(start);
    if (!dates.has(date)) continue;
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = Math.min(24 * 60, startMin + Math.max(b.actualMinutes, 5));
    out.push({ block: b, date, startMin, endMin });
  }
  return out;
}

export interface WeekSummary {
  focusMinutes: number;
  blockCount: number;
  averageQuality: number | null;
  bySpace: { spaceId: string | null; minutes: number }[];
  leisureMinutes: number;
}

export function summarizeWeek(entries: ResolvedEntry[], placed: PlacedBlock[]): WeekSummary {
  const focusMinutes = placed.reduce((n, p) => n + p.block.actualMinutes, 0);
  const bySpaceMap = new Map<string | null, number>();
  for (const p of placed) {
    const k = p.block.spaceId ?? null;
    bySpaceMap.set(k, (bySpaceMap.get(k) ?? 0) + p.block.actualMinutes);
  }
  const rated = placed.filter((p) => p.block.quality > 0);
  return {
    focusMinutes,
    blockCount: placed.length,
    averageQuality: rated.length ? rated.reduce((n, p) => n + p.block.quality, 0) / rated.length : null,
    bySpace: [...bySpaceMap.entries()]
      .map(([spaceId, minutes]) => ({ spaceId, minutes }))
      .sort((a, b) => b.minutes - a.minutes),
    leisureMinutes: entries
      .filter((e) => e.kind === 'leisure')
      .reduce((n, e) => n + (e.endSlot - e.startSlot) * 30, 0),
  };
}

/**
 * Side-by-side lanes for overlapping items in one day column.
 * Returns lane index and the number of lanes in each item's overlap group.
 */
export function layoutLanes<T extends { start: number; end: number }>(items: T[]): (T & { lane: number; lanes: number })[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: (T & { lane: number; lanes: number })[] = [];
  let group: (T & { lane: number; lanes: number })[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;
  const flush = () => {
    for (const g of group) g.lanes = laneEnds.length;
    result.push(...group);
    group = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (it.start >= groupEnd) {
      flush();
      groupEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else laneEnds[lane] = it.end;
    group.push({ ...it, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, it.end);
  }
  flush();
  return result;
}

export function slotLabel(slot: number): string {
  const d = new Date(2000, 0, 1, Math.floor(slot / 2), (slot % 2) * 30);
  if (slot === SLOTS_PER_DAY) return 'Midnight';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
