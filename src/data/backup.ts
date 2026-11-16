/**
 * Export and import of all data as JSON.
 *
 * - "replace" wipes local data and loads the file exactly.
 * - "merge" keeps whichever copy of each record was updated most recently,
 *   which is also how a future sync will reconcile devices.
 */
import { db, RECORD_TABLES, type RecordTable } from './db';
import type { BaseRecord, Meta, Settings } from './types';

export const BACKUP_APP = 'unhurried';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<RecordTable, BaseRecord[]> & { settings: Settings[]; meta: Meta[] };
}

export async function exportAll(): Promise<Backup> {
  const data = {} as Backup['data'];
  await db.transaction('r', db.tables, async () => {
    for (const name of RECORD_TABLES) data[name] = await db.table(name).toArray();
    data.settings = await db.settings.toArray();
    data.meta = await db.meta.toArray();
  });
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

export class BackupError extends Error {}

/** Validate an unknown parsed JSON value as a backup. Throws BackupError. */
export function parseBackup(raw: unknown): Backup {
  if (!raw || typeof raw !== 'object') throw new BackupError("This file doesn't look like an Unhurried backup.");
  const b = raw as Partial<Backup>;
  if (b.app !== BACKUP_APP || !b.data || typeof b.data !== 'object') {
    throw new BackupError("This file doesn't look like an Unhurried backup.");
  }
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of the app. Please update and try again.');
  }
  const data = {} as Backup['data'];
  for (const name of RECORD_TABLES) {
    const rows = (b.data as Record<string, unknown>)[name] ?? [];
    if (!Array.isArray(rows)) throw new BackupError(`The "${name}" section of the file is damaged.`);
    for (const r of rows) {
      if (!r || typeof r !== 'object' || typeof (r as BaseRecord).id !== 'string') {
        throw new BackupError(`The "${name}" section of the file is damaged.`);
      }
    }
    data[name] = rows as BaseRecord[];
  }
  const settings = (b.data as Record<string, unknown>).settings;
  data.settings = Array.isArray(settings) ? (settings as Settings[]).filter((s) => s?.id === 'app') : [];
  const meta = (b.data as Record<string, unknown>).meta;
  data.meta = Array.isArray(meta) ? (meta as Meta[]).filter((m) => typeof m?.key === 'string') : [];
  return { app: BACKUP_APP, version: b.version, exportedAt: String(b.exportedAt ?? ''), data };
}

export function summarize(b: Backup): { label: string; count: number }[] {
  const live = (rows: BaseRecord[]) => rows.filter((r) => !r.deletedAt).length;
  return [
    { label: 'Spaces', count: live(b.data.spaces) },
    { label: 'Tasks', count: live(b.data.tasks) },
    { label: 'Templates', count: live(b.data.templates) },
    { label: 'Goals', count: live(b.data.goals) },
    { label: 'Focus blocks', count: live(b.data.blocks) },
    { label: 'Schedule entries', count: live(b.data.scheduleTemplate) + live(b.data.scheduleOverrides) },
    { label: 'Break ideas', count: live(b.data.breakIdeas) },
  ];
}

export async function importBackup(b: Backup, mode: 'replace' | 'merge'): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of RECORD_TABLES) {
      const table = db.table<BaseRecord, string>(name);
      const incoming = b.data[name];
      if (mode === 'replace') {
        await table.clear();
        await table.bulkPut(incoming);
      } else {
        const existing = new Map((await table.toArray()).map((r) => [r.id, r]));
        const newer = incoming.filter((r) => {
          const cur = existing.get(r.id);
          return !cur || (r.updatedAt ?? 0) > (cur.updatedAt ?? 0);
        });
        await table.bulkPut(newer);
      }
    }
    if (mode === 'replace') {
      await db.settings.clear();
      await db.meta.clear();
    }
    if (b.data.settings[0]) {
      const cur = await db.settings.get('app');
      if (mode === 'replace' || !cur || b.data.settings[0].updatedAt > cur.updatedAt) {
        await db.settings.put(b.data.settings[0]);
      }
    }
    // Never re-seed sample data after an import.
    await db.meta.bulkPut(b.data.meta);
    await db.meta.put({ key: 'seeded', value: true });
  });
}

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `unhurried-backup-${d}.json`;
}
