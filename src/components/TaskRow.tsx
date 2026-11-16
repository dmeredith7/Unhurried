import { Check, ListChecks, Play, Repeat, Sun, SunDim } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as repos from '../data/repos';
import type { Space, Task } from '../data/types';
import { dueLabel, isPast, todayISO } from '../lib/dates';
import { SpaceBadge } from '../lib/spaceStyle';
import { describeRecurrence } from '../domain/recurrence';
import { formatCustomValue } from './taskFields';

function friendlyDue(due: string, today: string): string {
  const label = dueLabel(due, today);
  return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label;
}

export function TaskRow({
  task,
  space,
  onOpen,
  showSpace = true,
}: {
  task: Task;
  space: Space | undefined;
  onOpen: (task: Task) => void;
  showSpace?: boolean;
}) {
  const today = todayISO();
  const done = task.status === 'done';
  const plannedToday = task.plannedFor === today;
  const stillOnList = !done && task.dueDate && isPast(task.dueDate, today);

  return (
    <li className="group flex items-start gap-3 rounded-2xl bg-surface px-3 py-3 shadow-[0_1px_0_var(--line)] sm:px-4">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onClick={() => repos.setTaskDone(task, !done)}
        className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          done ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-accent'
        }`}
      >
        {done && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
      </button>

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="sr-only">Edit: </span>
        <span className={`block text-[15px] leading-snug ${done ? 'text-muted line-through' : ''}`}>
          {task.title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {showSpace && space && (
            <span className="inline-flex items-center gap-1.5">
              <SpaceBadge color={space.color} icon={space.icon} size="sm" />
              {space.name}
            </span>
          )}
          {task.dueDate && !done && (
            stillOnList ? (
              <span className="rounded-full bg-gentle-soft px-2 py-0.5 text-gentle">Still on your list</span>
            ) : (
              <span>Due {friendlyDue(task.dueDate, today)}</span>
            )
          )}
          <span>
            {task.estimateBlocks} {task.estimateBlocks === 1 ? 'block' : 'blocks'}
          </span>
          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Steps:</span>
              {task.subtasks.filter((x) => x.done).length}/{task.subtasks.length}
            </span>
          )}
          {task.recurrence && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3.5" aria-hidden="true" />
              {describeRecurrence(task.recurrence)}
            </span>
          )}
          {space?.fields.map((f) => {
            const text = formatCustomValue(f, task.customValues[f.id]);
            return text ? <span key={f.id}>{text}</span> : null;
          })}
          {task.priority === 'high' && !done && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-ink">Priority</span>
          )}
          {task.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </span>
      </button>

      {!done && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => repos.tasks.update(task.id, { plannedFor: plannedToday ? null : today })}
            aria-pressed={plannedToday}
            aria-label={plannedToday ? `Remove "${task.title}" from today` : `Add "${task.title}" to today`}
            title={plannedToday ? 'Remove from today' : 'Add to today'}
            className={`inline-flex size-9 items-center justify-center rounded-xl transition-colors ${
              plannedToday ? 'text-leisure' : 'text-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {plannedToday ? (
              <Sun className="size-4.5" aria-hidden="true" />
            ) : (
              <SunDim className="size-4.5" aria-hidden="true" />
            )}
          </button>
          <Link
            to={`/focus?task=${task.id}`}
            aria-label={`Start a focus block on "${task.title}"`}
            title="Start a block"
            className="inline-flex size-9 items-center justify-center rounded-xl text-accent transition-colors hover:bg-accent-soft"
          >
            <Play className="size-4.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </li>
  );
}
