import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import * as repos from './repos';
import { clearSampleData, hasSampleData, seedIfFirstRun } from './seed';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('repositories', () => {
  it('soft-deletes so records can sync later', async () => {
    const s = await repos.spaces.create({ name: 'Errands', color: 'sand', icon: 'cart', order: 0, fields: [] });
    await repos.spaces.remove(s.id);
    expect(await repos.spaces.list()).toHaveLength(0);
    const raw = await db.spaces.get(s.id);
    expect(raw?.deletedAt).toBeTypeOf('number');
  });

  it('moves tasks when a space is deleted', async () => {
    const a = await repos.spaces.create({ name: 'A', color: 'sage', icon: 'home', order: 0, fields: [] });
    const b = await repos.spaces.create({ name: 'B', color: 'sky', icon: 'home', order: 1, fields: [] });
    const t = await repos.tasks.create({ ...repos.blankTask(a.id), title: 'x' });
    await repos.removeSpace(a.id, b.id);
    expect((await repos.tasks.get(t.id))?.spaceId).toBe(b.id);
  });
});

describe('sample data', () => {
  it('seeds only once', async () => {
    await seedIfFirstRun();
    await seedIfFirstRun();
    expect(await repos.spaces.list()).toHaveLength(2);
  });

  it('clears samples but keeps the user’s own work', async () => {
    await seedIfFirstRun();
    const [work] = (await repos.spaces.list()).sort((x, y) => x.order - y.order);
    const mine = await repos.tasks.create({ ...repos.blankTask(work.id), title: 'My own task' });
    await clearSampleData();
    expect(await hasSampleData()).toBe(false);
    const spaces = await repos.spaces.list();
    expect(spaces.map((s) => s.name)).toEqual(['Work']);
    expect(await repos.templates.list()).toHaveLength(0); // kept because it holds my task
    expect((await repos.tasks.list()).map((t) => t.id)).toEqual([mine.id]);
  });
});
