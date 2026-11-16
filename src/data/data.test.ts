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

describe('schedule scopes', async () => {
  const { addEntry, updateEntry, deleteEntry } = await import('./schedule');
  const { resolveWeek } = await import('../domain/schedule');
  const week = async (start: string) =>
    resolveWeek(await repos.scheduleTemplate.list(), await repos.scheduleOverrides.list(), start);
  const v = { date: '2026-11-18', startSlot: 36, endSlot: 38, kind: 'leisure' as const, label: 'Gym', spaceId: null };

  it('edits only this week or every week', async () => {
    await addEntry(v, true);
    const [gym] = await week('2026-11-16');
    await updateEntry(gym, { ...v, label: 'Swim' }, 'week');
    expect((await week('2026-11-16')).map((e) => e.label)).toEqual(['Swim']);
    expect((await week('2026-11-23')).map((e) => e.label)).toEqual(['Gym']);

    const [nextGym] = await week('2026-11-23');
    await updateEntry(nextGym, { ...v, date: '2026-11-26', label: 'Yoga' }, 'all');
    expect((await week('2026-11-30')).map((e) => `${e.label}@${e.date}`)).toEqual(['Yoga@2026-12-03']);
    expect((await week('2026-11-16')).map((e) => e.label)).toEqual(['Swim']); // this week's change kept
  });

  it('deletes only this week or every week', async () => {
    await addEntry(v, true);
    await addEntry({ ...v, date: '2026-11-21', label: 'Party' }, false);
    const [gym, party] = await week('2026-11-16');
    await deleteEntry(gym, 'week');
    await deleteEntry(party, 'week');
    expect(await week('2026-11-16')).toHaveLength(0);
    expect((await week('2026-11-23')).map((e) => e.label)).toEqual(['Gym']);
    const [g2] = await week('2026-11-23');
    await deleteEntry(g2, 'all');
    expect(await week('2026-11-30')).toHaveLength(0);
  });
});

describe('goals', async () => {
  const { createGoalPlan, deleteGoal } = await import('./goals');
  it('creates milestones and a first step as linked tasks, and deletes them together', async () => {
    const s = await repos.spaces.create({ name: 'Side', color: 'sage', icon: 'rocket', order: 0, fields: [] });
    const goal = await createGoalPlan({
      title: 'Launch the newsletter',
      notes: '',
      deadline: '2027-01-31',
      spaceId: s.id,
      milestones: [
        { title: 'Pick a name', date: '2026-12-01' },
        { title: 'First issue sent', date: '2027-01-31' },
      ],
      firstStep: { title: 'List five name ideas', today: true },
    });
    const tasks = (await repos.tasks.list()).filter((t) => t.goalId === goal.id);
    expect(tasks.filter((t) => t.kind === 'milestone').map((t) => t.title)).toEqual(['Pick a name', 'First issue sent']);
    const step = tasks.find((t) => t.kind === 'step')!;
    expect(step.parentId).toBe(tasks.find((t) => t.title === 'Pick a name')!.id);
    expect(step.plannedFor).toBeTruthy();
    await deleteGoal(goal);
    expect(await repos.tasks.list()).toHaveLength(0);
    expect(await repos.goals.list()).toHaveLength(0);
  });
});
