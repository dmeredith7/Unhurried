/**
 * Core data types. Every stored record extends BaseRecord so that a sync
 * backend can later reconcile by `updatedAt` and propagate soft deletes.
 */

export interface BaseRecord {
  id: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  /** Soft-delete marker (epoch ms). Kept so deletions can sync later. */
  deletedAt?: number | null;
}

export type SpaceColor =
  | 'sage'
  | 'sky'
  | 'lavender'
  | 'apricot'
  | 'blush'
  | 'sand'
  | 'teal'
  | 'slate';

export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';

export interface CustomFieldDef {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; // for 'select'
}

export interface Space extends BaseRecord {
  name: string;
  color: SpaceColor;
  icon: string; // key into the icon registry
  order: number;
  fields: CustomFieldDef[];
}

export type Priority = 'low' | 'normal' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Every N days/weeks/months. */
  interval: number;
  /** For weekly: 0 = Sunday … 6 = Saturday. */
  weekdays?: number[];
  /** Whether the next date counts from the due date or from completion. */
  from: 'due' | 'completion';
  /** For monthly: the day to aim for (keeps the 31st from drifting to the 28th). */
  dayOfMonth?: number;
}

export type TaskKind = 'task' | 'milestone' | 'step';

export type CustomValue = string | number | boolean;

export interface Task extends BaseRecord {
  spaceId: string;
  title: string;
  notes: string;
  /** Local calendar date, YYYY-MM-DD. */
  dueDate?: string | null;
  /** Estimated number of focus blocks. */
  estimateBlocks: number;
  priority: Priority;
  tags: string[];
  subtasks: Subtask[];
  customValues: Record<string, CustomValue>;
  recurrence?: Recurrence | null;
  status: 'open' | 'done';
  completedAt?: number | null;
  /** For a completed recurring task: the next occurrence it created. */
  spawnedId?: string | null;
  /** Date (YYYY-MM-DD) the user chose to work on this; shows in Today. */
  plannedFor?: string | null;
  // Reverse-calendar links (phase 5)
  goalId?: string | null;
  parentId?: string | null;
  kind: TaskKind;
  order: number;
}

export interface Template extends BaseRecord {
  name: string;
  spaceId?: string | null;
  title: string;
  notes: string;
  estimateBlocks: number;
  priority: Priority;
  tags: string[];
  subtasks: string[];
  recurrence?: Recurrence | null;
}

export interface Goal extends BaseRecord {
  title: string;
  notes: string;
  deadline: string; // YYYY-MM-DD
  spaceId: string;
  status: 'active' | 'done' | 'archived';
}

export interface WorkBlock extends BaseRecord {
  taskId?: string | null;
  spaceId?: string | null;
  label?: string;
  startedAt: number;
  endedAt: number;
  plannedMinutes: number;
  actualMinutes: number;
  quality: number; // 1–5
  note: string;
  warmUp: boolean;
}

export type ScheduleKind = 'committed' | 'leisure' | 'plannedWork';

/** Repeats every week on `weekday`. */
export interface ScheduleTemplateEntry extends BaseRecord {
  weekday: number; // 0 = Sunday
  startSlot: number; // 0–47, 30-minute slots from midnight
  endSlot: number; // exclusive
  kind: ScheduleKind;
  label: string;
  spaceId?: string | null;
}

/**
 * A one-week change. Either a one-off entry (no templateEntryId), or a
 * replacement for one occurrence of a weekly entry: that occurrence (on
 * `replacesDate`) is hidden, and unless `hidden` is set this entry shows on
 * `date` instead. Keyed by calendar date so changing the week's start day
 * never misplaces anything.
 */
export interface ScheduleOverride extends BaseRecord {
  date: string; // YYYY-MM-DD where this entry appears
  templateEntryId?: string | null;
  replacesDate?: string | null;
  hidden?: boolean;
  startSlot: number;
  endSlot: number;
  kind: ScheduleKind;
  label: string;
  spaceId?: string | null;
}

export interface BreakIdea extends BaseRecord {
  text: string;
  order: number;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  id: 'app';
  blockMinutes: number;
  warmUp: boolean;
  sound: boolean;
  notifications: boolean;
  weekStartsOn: 0 | 1; // Sunday or Monday
  theme: ThemePref;
  reframes: boolean;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  blockMinutes: 30,
  warmUp: true,
  sound: true,
  notifications: true,
  weekStartsOn: 1,
  theme: 'system',
  reframes: true,
  updatedAt: 0,
};

export interface Meta {
  key: string;
  value: unknown;
}
