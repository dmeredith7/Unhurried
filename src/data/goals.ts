/** Goals: milestones and steps are ordinary tasks linked to the goal. */
import * as repos from './repos';
import type { Goal, Task } from './types';
import { todayISO } from '../lib/dates';

export async function createGoalPlan(opts: {
  title: string;
  notes: string;
  deadline: string;
  spaceId: string;
  milestones: { title: string; date: string }[]; // chronological
  firstStep?: { title: string; today: boolean } | null;
}): Promise<Goal> {
  return repos.transaction(async () => {
    const goal = await repos.goals.create({
      title: opts.title,
      notes: opts.notes,
      deadline: opts.deadline,
      spaceId: opts.spaceId,
      status: 'active',
    });
    const created: Task[] = [];
    for (const [i, m] of opts.milestones.entries()) {
      created.push(
        await repos.tasks.create({
          ...repos.blankTask(opts.spaceId),
          title: m.title,
          dueDate: m.date,
          kind: 'milestone',
          goalId: goal.id,
          order: i,
        }),
      );
    }
    if (opts.firstStep?.title.trim() && created[0]) {
      await addStep(goal, created[0], opts.firstStep.title, opts.firstStep.today);
    }
    return goal;
  });
}

export async function addStep(goal: Goal, milestone: Task, title: string, today = false): Promise<Task> {
  return repos.tasks.create({
    ...repos.blankTask(milestone.spaceId || goal.spaceId),
    title: title.trim(),
    kind: 'step',
    goalId: goal.id,
    parentId: milestone.id,
    plannedFor: today ? todayISO() : null,
  });
}

export async function addMilestone(goal: Goal, title: string, date: string): Promise<Task> {
  return repos.tasks.create({
    ...repos.blankTask(goal.spaceId),
    title: title.trim(),
    dueDate: date,
    kind: 'milestone',
    goalId: goal.id,
  });
}

/** Apply new milestone dates (and possibly a new deadline) at once. */
export async function applyDates(goal: Goal, dates: Record<string, string>, deadline: string): Promise<void> {
  await repos.transaction(async () => {
    for (const [id, date] of Object.entries(dates)) await repos.tasks.update(id, { dueDate: date });
    if (deadline !== goal.deadline) await repos.goals.update(goal.id, { deadline });
  });
}

export async function deleteGoal(goal: Goal): Promise<void> {
  await repos.transaction(async () => {
    for (const t of await repos.tasks.list()) if (t.goalId === goal.id) await repos.tasks.remove(t.id);
    await repos.goals.remove(goal.id);
  });
}
