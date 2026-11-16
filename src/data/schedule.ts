/** Saving Unschedule entries with "every week" or "only this week" scope. */
import type { ResolvedEntry } from '../domain/schedule';
import { parseISODate } from '../lib/dates';
import * as repos from './repos';
import type { ScheduleKind } from './types';

export interface EntryValues {
  date: string;
  startSlot: number;
  endSlot: number;
  kind: ScheduleKind;
  label: string;
  spaceId: string | null;
}

export type Scope = 'all' | 'week';

export async function addEntry(v: EntryValues, repeatWeekly: boolean): Promise<void> {
  const { date, ...rest } = v;
  if (repeatWeekly) {
    await repos.scheduleTemplate.create({ ...rest, weekday: parseISODate(date).getDay() });
  } else {
    await repos.scheduleOverrides.create({ ...v, templateEntryId: null, replacesDate: null, hidden: false });
  }
}

export async function updateEntry(entry: ResolvedEntry, v: EntryValues, scope: Scope): Promise<void> {
  const { date, ...rest } = v;
  if (entry.overrideId) {
    // Already a one-week entry: just edit it.
    await repos.scheduleOverrides.update(entry.overrideId, v);
    return;
  }
  if (!entry.templateEntryId) return;
  if (scope === 'all') {
    await repos.scheduleTemplate.update(entry.templateEntryId, { ...rest, weekday: parseISODate(date).getDay() });
  } else {
    await repos.scheduleOverrides.create({
      ...v,
      templateEntryId: entry.templateEntryId,
      replacesDate: entry.date,
      hidden: false,
    });
  }
}

export async function deleteEntry(entry: ResolvedEntry, scope: Scope): Promise<void> {
  if (entry.overrideId) {
    // A modified weekly occurrence stays hidden this week; a one-off goes away.
    if (entry.templateEntryId) await repos.scheduleOverrides.update(entry.overrideId, { hidden: true });
    else await repos.scheduleOverrides.remove(entry.overrideId);
    return;
  }
  if (!entry.templateEntryId) return;
  if (scope === 'all') {
    await repos.scheduleTemplate.remove(entry.templateEntryId);
  } else {
    await repos.scheduleOverrides.create({
      date: entry.date,
      templateEntryId: entry.templateEntryId,
      replacesDate: entry.date,
      hidden: true,
      startSlot: entry.startSlot,
      endSlot: entry.endSlot,
      kind: entry.kind,
      label: entry.label,
      spaceId: entry.spaceId ?? null,
    });
  }
}
