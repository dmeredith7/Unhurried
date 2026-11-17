import { Plus, Timer } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { TaskEditor, type TaskDraft } from '../components/TaskEditor';
import { TaskRow } from '../components/TaskRow';
import { Button, EmptyState, PageHeader, inputClass } from '../components/ui';
import { useBlocks, useSettings, useSpaceMap, useSpaces, useTasks } from '../data/hooks';
import * as repos from '../data/repos';
import type { Task } from '../data/types';
import { friendlyToday, todayISO, toISODate } from '../lib/dates';
import { sortTasks } from '../lib/taskSort';

function greeting(h: number) {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TodayScreen() {
  const tasks = useTasks();
  const spaces = useSpaces() ?? [];
  const spaceMap = useSpaceMap();
  const settings = useSettings();
  const [editing, setEditing] = useState<TaskDraft | null>(null);
  const [quick, setQuick] = useState('');
  const today = todayISO();
  const blocksToday = (useBlocks() ?? []).filter((b) => toISODate(new Date(b.startedAt)) === today);
  const focusMinutes = blocksToday.reduce((n, b) => n + b.actualMinutes, 0);

  const { forToday, stillOnList, doneToday } = useMemo(() => {
    const all = tasks ?? [];
    const open = all.filter((t) => t.status === 'open' && t.kind !== 'milestone');
    return {
      forToday: sortTasks(open.filter((t) => t.plannedFor === today || t.dueDate === today)),
      stillOnList: sortTasks(
        open.filter((t) => t.dueDate && t.dueDate < today && t.plannedFor !== today),
      ),
      doneToday: all.filter(
        (t) => t.status === 'done' && t.completedAt && toISODate(new Date(t.completedAt)) === today,
      ),
    };
  }, [tasks, today]);

  async function quickAdd(e: FormEvent) {
    e.preventDefault();
    const title = quick.trim();
    if (!title || !spaces[0]) return;
    await repos.tasks.create({ ...repos.blankTask(spaces[0].id), title, plannedFor: today });
    setQuick('');
  }

  const open = (t: Task) => setEditing(t);

  return (
    <>
      <PageHeader title={greeting(new Date().getHours())} subtitle={friendlyToday()} />

      <section
        aria-label="Start a focus block"
        className="mb-8 flex flex-col gap-4 rounded-3xl bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          {blocksToday.length > 0 ? (
            <>
              <p className="text-lg font-medium">
                {blocksToday.length} {blocksToday.length === 1 ? 'block' : 'blocks'} today,{' '}
                {focusMinutes < 60 ? `${focusMinutes} min` : `${(focusMinutes / 60).toFixed(1).replace(/\.0$/, '')} h`} of
                focus
              </p>
              <p className="text-sm text-muted">
                That's real progress.{' '}
                <Link to="/progress" className="underline underline-offset-2">
                  See your week
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">When can you start?</p>
              <p className="text-sm text-muted">
                One {settings.blockMinutes}-minute block is enough. You don't have to finish, just begin.
              </p>
            </>
          )}
        </div>
        <Link
          to="/focus"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-ink hover:opacity-90"
        >
          <Timer className="size-5" aria-hidden="true" />
          Start a block
        </Link>
      </section>

      <form onSubmit={quickAdd} className="mb-6 flex gap-2">
        <label htmlFor="quick-add" className="sr-only">
          Add a task for today
        </label>
        <input
          id="quick-add"
          className={inputClass}
          placeholder={spaces[0] ? `Add something for today (${spaces[0].name})` : 'Create a space first in Settings'}
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          disabled={!spaces[0]}
        />
        <Button type="submit" variant="primary" disabled={!quick.trim()} aria-label="Add task">
          <Plus className="size-5" aria-hidden="true" />
        </Button>
      </form>

      <Section title="Today" count={forToday.length}>
        {tasks && forToday.length === 0 ? (
          <EmptyState title="Nothing planned yet">
            Tap the sun on any task to bring it here, or add one above. Small is good.
          </EmptyState>
        ) : (
          <TaskList tasks={forToday} spaceMap={spaceMap} onOpen={open} />
        )}
      </Section>

      {stillOnList.length > 0 && (
        <Section
          title="Still on your list"
          count={stillOnList.length}
          note="No rush. These are waiting whenever you're ready to pick one."
        >
          <TaskList tasks={stillOnList} spaceMap={spaceMap} onOpen={open} />
        </Section>
      )}

      {doneToday.length > 0 && (
        <Section title="Done today" count={doneToday.length} note="Nice work. Every bit counts.">
          <TaskList tasks={doneToday} spaceMap={spaceMap} onOpen={open} />
        </Section>
      )}

      <TaskEditor open={!!editing} task={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function Section({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-1 flex items-baseline gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
        {title}
        {count > 0 && <span className="font-normal">{count}</span>}
      </h2>
      {note && <p className="mb-3 text-sm text-muted">{note}</p>}
      <div className={note ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

function TaskList({
  tasks,
  spaceMap,
  onOpen,
}: {
  tasks: Task[];
  spaceMap: Map<string, import('../data/types').Space>;
  onOpen: (t: Task) => void;
}) {
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} space={spaceMap.get(t.spaceId)} onOpen={onOpen} />
      ))}
    </ul>
  );
}
