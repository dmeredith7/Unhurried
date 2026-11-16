import Dexie, { type Table } from 'dexie';
import type {
  BreakIdea,
  Goal,
  Meta,
  ScheduleOverride,
  ScheduleTemplateEntry,
  Settings,
  Space,
  Task,
  Template,
  WorkBlock,
} from './types';

/**
 * The local IndexedDB database. Only the repository layer (repos.ts) should
 * import this directly; screens and components go through repos/hooks.
 */
export class UnhurriedDB extends Dexie {
  spaces!: Table<Space, string>;
  tasks!: Table<Task, string>;
  templates!: Table<Template, string>;
  goals!: Table<Goal, string>;
  blocks!: Table<WorkBlock, string>;
  scheduleTemplate!: Table<ScheduleTemplateEntry, string>;
  scheduleOverrides!: Table<ScheduleOverride, string>;
  breakIdeas!: Table<BreakIdea, string>;
  settings!: Table<Settings, string>;
  meta!: Table<Meta, string>;

  constructor(name = 'unhurried') {
    super(name);
    this.version(1).stores({
      spaces: 'id, order, updatedAt',
      tasks: 'id, spaceId, status, dueDate, plannedFor, goalId, parentId, updatedAt',
      templates: 'id, updatedAt',
      goals: 'id, status, updatedAt',
      blocks: 'id, taskId, startedAt, updatedAt',
      scheduleTemplate: 'id, weekday, updatedAt',
      scheduleOverrides: 'id, weekStart, updatedAt',
      breakIdeas: 'id, order, updatedAt',
      settings: 'id',
      meta: 'key',
    });
  }
}

export const db = new UnhurriedDB();

/** Names of the tables that hold syncable records (used by export/import). */
export const RECORD_TABLES = [
  'spaces',
  'tasks',
  'templates',
  'goals',
  'blocks',
  'scheduleTemplate',
  'scheduleOverrides',
  'breakIdeas',
] as const;

export type RecordTable = (typeof RECORD_TABLES)[number];
