import { beforeEach, describe, expect, it } from 'vitest';
import { BackupError, exportAll, importBackup, parseBackup } from './backup';
import { db } from './db';
import * as repos from './repos';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function makeSpace(name: string) {
  return repos.spaces.create({ name, color: 'sage', icon: 'home', order: 0, fields: [] });
}

describe('backup', () => {
  it('round-trips through JSON with replace', async () => {
    const s = await makeSpace('Home');
    await repos.tasks.create({ ...repos.blankTask(s.id), title: 'Dishes' });
    await repos.settings.update({ blockMinutes: 45 });
    const json = JSON.stringify(await exportAll());

    await db.delete();
    await db.open();
    await makeSpace('Something else');

    await importBackup(parseBackup(JSON.parse(json)), 'replace');
    expect((await repos.spaces.list()).map((x) => x.name)).toEqual(['Home']);
    expect((await repos.tasks.list())[0].title).toBe('Dishes');
    expect((await repos.settings.get()).blockMinutes).toBe(45);
  });

  it('merge keeps the most recently updated copy', async () => {
    const s = await makeSpace('Home');
    const backup = await exportAll(); // has "Home"
    await repos.spaces.update(s.id, { name: 'Home (newer)' });
    const other = await makeSpace('Local only');

    await importBackup(backup, 'merge');
    const names = (await repos.spaces.list()).map((x) => x.name).sort();
    expect(names).toEqual(['Home (newer)', 'Local only']);
    expect(await repos.spaces.get(other.id)).toBeDefined();
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow(BackupError);
    expect(() => parseBackup({ app: 'unhurried', version: 99, data: {} })).toThrow(/newer version/);
    expect(() => parseBackup({ app: 'unhurried', version: 1, data: { tasks: [{ nope: 1 }] } })).toThrow(
      /damaged/,
    );
  });
});

describe('recurring completion', () => {
  it('creates the next occurrence and removes it on undo', async () => {
    const s = await makeSpace('Home');
    const t = await repos.tasks.create({
      ...repos.blankTask(s.id),
      title: 'Take out bins',
      dueDate: '2026-11-16',
      recurrence: { freq: 'weekly', interval: 1, from: 'due' },
      subtasks: [{ id: 'a', title: 'Recycling', done: true }],
    });

    await repos.setTaskDone(t, true, '2026-11-16');
    const open = (await repos.tasks.list()).filter((x) => x.status === 'open');
    expect(open).toHaveLength(1);
    expect(open[0].dueDate).toBe('2026-11-23');
    expect(open[0].subtasks[0].done).toBe(false);

    const done = (await repos.tasks.get(t.id))!;
    await repos.setTaskDone(done, false, '2026-11-16');
    const all = await repos.tasks.list();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('open');
  });
});
