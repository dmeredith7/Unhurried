/**
 * Repository layer: the only place that talks to storage.
 *
 * Screens use these interfaces (usually via hooks.ts). Today they are backed
 * by Dexie/IndexedDB. A future sync backend can keep Dexie as the local cache
 * and push/pull records whose `updatedAt` changed, using `deletedAt` for
 * deletions — no screen code needs to change.
 */
import type { Table } from 'dexie';
import { db } from './db';
import { newId } from '../lib/ids';
import {
  DEFAULT_SETTINGS,
  type BaseRecord,
  type BreakIdea,
  type Goal,
  type ScheduleOverride,
  type ScheduleTemplateEntry,
  type Settings,
  type Space,
  type Task,
  type Template,
  type WorkBlock,
} from './types';

export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord> &
  Partial<Pick<BaseRecord, 'id' | 'sample'>>;

export interface Repo<T extends BaseRecord> {
  /** All records that are not soft-deleted. */
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: NewRecord<T>): Promise<T>;
  update(id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void>;
  /** Soft delete. */
  remove(id: string): Promise<void>;
}

function isLive<T extends BaseRecord>(r: T | undefined): r is T {
  return !!r && !r.deletedAt;
}

function dexieRepo<T extends BaseRecord>(table: Table<T, string>): Repo<T> {
  return {
    async list() {
      return (await table.toArray()).filter(isLive);
    },
    async get(id) {
      const r = await table.get(id);
      return isLive(r) ? r : undefined;
    },
    async create(input) {
      const now = Date.now();
      const record = {
        ...input,
        id: input.id ?? newId(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      } as unknown as T;
      await table.add(record);
      return record;
    },
    async update(id, patch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await table.update(id, { ...patch, updatedAt: Date.now() } as any);
    },
    async remove(id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await table.update(id, { deletedAt: Date.now(), updatedAt: Date.now() } as any);
    },
  };
}

export const spaces = dexieRepo<Space>(db.spaces);
export const tasks = dexieRepo<Task>(db.tasks);
export const templates = dexieRepo<Template>(db.templates);
export const goals = dexieRepo<Goal>(db.goals);
export const blocks = dexieRepo<WorkBlock>(db.blocks);
export const scheduleTemplate = dexieRepo<ScheduleTemplateEntry>(db.scheduleTemplate);
export const scheduleOverrides = dexieRepo<ScheduleOverride>(db.scheduleOverrides);
export const breakIdeas = dexieRepo<BreakIdea>(db.breakIdeas);

export const settings = {
  async get(): Promise<Settings> {
    const s = await db.settings.get('app');
    return { ...DEFAULT_SETTINGS, ...s };
  },
  async update(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
    const current = await settings.get();
    await db.settings.put({ ...current, ...patch, id: 'app', updatedAt: Date.now() });
  },
};

export const meta = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await db.meta.get(key))?.value as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    await db.meta.put({ key, value });
  },
};

/** Run several repo calls atomically. */
export function transaction<R>(fn: () => Promise<R>): Promise<R> {
  return db.transaction('rw', db.tables, fn);
}

// ---- Task helpers -------------------------------------------------------

export function blankTask(spaceId: string): NewRecord<Task> {
  return {
    spaceId,
    title: '',
    notes: '',
    dueDate: null,
    estimateBlocks: 1,
    priority: 'normal',
    tags: [],
    subtasks: [],
    customValues: {},
    recurrence: null,
    status: 'open',
    completedAt: null,
    plannedFor: null,
    goalId: null,
    parentId: null,
    kind: 'task',
    order: Date.now(),
  };
}

export async function setTaskDone(task: Task, done: boolean): Promise<void> {
  await tasks.update(task.id, {
    status: done ? 'done' : 'open',
    completedAt: done ? Date.now() : null,
  });
}

/**
 * Delete a space. Its tasks (and templates) move to `moveTo` if given,
 * otherwise they are deleted too.
 */
export async function removeSpace(id: string, moveTo?: string): Promise<void> {
  await transaction(async () => {
    const spaceTasks = (await tasks.list()).filter((t) => t.spaceId === id);
    for (const t of spaceTasks) {
      if (moveTo) await tasks.update(t.id, { spaceId: moveTo, customValues: {} });
      else await tasks.remove(t.id);
    }
    const spaceTemplates = (await templates.list()).filter((t) => t.spaceId === id);
    for (const t of spaceTemplates) await templates.update(t.id, { spaceId: moveTo ?? null });
    await spaces.remove(id);
  });
}
