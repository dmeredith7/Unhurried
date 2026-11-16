import type { Task } from '../data/types';

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;

/** Open tasks first; then by due date (undated last), priority, creation. */
export function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    const ad = a.dueDate ?? '9999-12-31';
    const bd = b.dueDate ?? '9999-12-31';
    if (ad !== bd) return ad < bd ? -1 : 1;
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr) return pr;
    return a.createdAt - b.createdAt;
  });
}
