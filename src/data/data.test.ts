import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import * as repos from './repos';
import { completeOnboarding, ensureDefaults, isOnboarded } from './setup';

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

describe('first-run setup', () => {
  it('adds default break ideas once and no sample tasks', async () => {
    await ensureDefaults();
    await ensureDefaults();
    expect((await repos.breakIdeas.list()).length).toBe(8);
    expect(await repos.tasks.list()).toHaveLength(0);
    expect(await isOnboarded()).toBe(false);
  });

  it('creates chosen spaces and a first task for today', async () => {
    await completeOnboarding({ spaceKeys: ['work', 'errands'], customSpace: 'Garden', firstTask: 'Write one sentence' });
    const spaces = (await repos.spaces.list()).sort((a, b) => a.order - b.order);
    expect(spaces.map((s) => s.name)).toEqual(['Work', 'Errands', 'Garden']);
    expect(spaces[0].fields.map((f) => f.name)).toEqual(['Client']);
    const [task] = await repos.tasks.list();
    expect(task.title).toBe('Write one sentence');
    expect(task.spaceId).toBe(spaces[0].id);
    expect(task.plannedFor).toBeTruthy();
    expect(await isOnboarded()).toBe(true);
  });

  it('always leaves at least one space', async () => {
    await completeOnboarding({ spaceKeys: [] });
    expect((await repos.spaces.list()).map((s) => s.name)).toEqual(['Personal']);
  });
});
