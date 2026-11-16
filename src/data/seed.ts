import { db } from './db';
import * as repos from './repos';
import { addDays, parseISODate, todayISO } from '../lib/dates';

const SEEDED_KEY = 'seeded';

/** Insert the sample setup the first time the app runs. */
export async function seedIfFirstRun(): Promise<void> {
  await repos.transaction(async () => {
    if (await repos.meta.get(SEEDED_KEY)) return;
    await repos.meta.set(SEEDED_KEY, true);
    await insertSample();
  });
}

async function insertSample() {
  const today = todayISO();

  const work = await repos.spaces.create({
    name: 'Work',
    color: 'sky',
    icon: 'briefcase',
    order: 0,
    fields: [{ id: 'client', name: 'Client', type: 'text' }],
    sample: true,
  });
  const home = await repos.spaces.create({
    name: 'Home',
    color: 'sage',
    icon: 'home',
    order: 1,
    fields: [
      {
        id: 'room',
        name: 'Room',
        type: 'select',
        options: ['Kitchen', 'Living room', 'Bedroom', 'Bathroom', 'Garden'],
      },
    ],
    sample: true,
  });

  const base = (spaceId: string) => ({ ...repos.blankTask(spaceId), sample: true });

  await repos.tasks.create({
    ...base(work.id),
    title: 'Outline the quarterly report',
    notes: 'Just the headings and a few bullet points. A rough start counts.',
    subtasks: [
      { id: 's1', title: 'List the main sections', done: false },
      { id: 's2', title: 'Jot one bullet under each', done: false },
    ],
    estimateBlocks: 2,
    priority: 'high',
    tags: ['writing'],
    dueDate: addDays(today, 3),
    plannedFor: today,
    customValues: { client: 'Internal' },
  });
  await repos.tasks.create({
    ...base(work.id),
    title: 'Reply to the design feedback email',
    estimateBlocks: 1,
    tags: ['email'],
    dueDate: today,
  });
  await repos.tasks.create({
    ...base(work.id),
    title: 'Read the onboarding guide',
    estimateBlocks: 1,
    priority: 'low',
    tags: ['reading'],
  });
  await repos.tasks.create({
    ...base(home.id),
    title: 'Water the plants',
    estimateBlocks: 1,
    priority: 'low',
    plannedFor: today,
    customValues: { room: 'Living room' },
  });
  await repos.tasks.create({
    ...base(home.id),
    title: 'Sort the paperwork pile',
    notes: 'Start with whatever is on top. Fifteen minutes is enough.',
    estimateBlocks: 1,
    tags: ['admin'],
    dueDate: addDays(today, -2),
  });
  await repos.tasks.create({
    ...base(home.id),
    title: 'Take out the bins',
    estimateBlocks: 1,
    priority: 'low',
    dueDate: addDays(today, 1),
    recurrence: { freq: 'weekly', interval: 1, from: 'due', weekdays: [parseISODate(addDays(today, 1)).getDay()] },
  });
  await repos.templates.create({
    name: 'Weekly clean',
    spaceId: home.id,
    title: 'Weekly clean',
    notes: 'Put on some music. Do as much as feels good.',
    estimateBlocks: 2,
    priority: 'normal',
    tags: ['chores'],
    subtasks: ['Tidy surfaces', 'Vacuum', 'Wipe the kitchen', 'Clean the bathroom', 'Change the bedsheets'],
    recurrence: null,
    sample: true,
  });
  await repos.tasks.create({
    ...base(home.id),
    title: 'Plan meals for the week',
    estimateBlocks: 1,
    tags: ['food'],
    dueDate: addDays(today, 5),
    customValues: { room: 'Kitchen' },
  });
}

/**
 * Remove the sample setup. Sample spaces that now hold the user's own tasks
 * are kept (and become regular spaces) so nothing of theirs is lost.
 */
export async function clearSampleData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    const allTasks = await db.tasks.toArray();
    const userSpaceIds = new Set(allTasks.filter((t) => !t.sample).map((t) => t.spaceId));

    for (const table of [db.tasks, db.goals, db.templates, db.blocks, db.breakIdeas]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (table as any).filter((r: { sample?: boolean }) => r.sample).delete();
    }
    const sampleSpaces = await db.spaces.filter((s) => !!s.sample).toArray();
    for (const s of sampleSpaces) {
      if (userSpaceIds.has(s.id)) await db.spaces.update(s.id, { sample: false });
      else await db.spaces.delete(s.id);
    }
  });
}

export async function hasSampleData(): Promise<boolean> {
  const [s, t] = await Promise.all([
    db.spaces.filter((r) => !!r.sample).count(),
    db.tasks.filter((r) => !!r.sample).count(),
  ]);
  return s + t > 0;
}
