import { ArrowLeft, CalendarClock, Check, Flag, Pencil, Play, Plus, Sun, SunDim, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GoalWizard } from '../components/GoalWizard';
import { Button, EmptyState, Field, IconButton, PageHeader, Sheet, inputClass } from '../components/ui';
import { addMilestone, addStep, applyDates, deleteGoal } from '../data/goals';
import { useGoals, useSpaceMap, useSpaces, useTasks } from '../data/hooks';
import * as repos from '../data/repos';
import type { Goal, Task } from '../data/types';
import { goalProgress, needsReflow, reflowKeepDeadline, reflowPush, sortByDate, type Reflow } from '../domain/reverse';
import { daysBetween, parseISODate, todayISO } from '../lib/dates';
import { SpaceBadge } from '../lib/spaceStyle';

function fmt(d: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return parseISODate(d).toLocaleDateString(undefined, opts);
}

function timeLeft(deadline: string, today: string): string {
  const days = daysBetween(today, deadline);
  if (days < 0) return 'Deadline has passed. Want to set a new one?';
  if (days === 0) return 'Today';
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'} away`;
  const weeks = Math.round(days / 7);
  if (days < 90) return `About ${weeks} weeks away`;
  return `About ${Math.round(days / 30)} months away`;
}

function useGoalTasks(goalId: string | undefined) {
  const tasks = useTasks();
  return useMemo(() => (tasks ?? []).filter((t) => t.goalId && t.goalId === goalId), [tasks, goalId]);
}

function progressOf(tasks: Task[]) {
  return goalProgress(
    tasks.map((t) => ({
      kind: t.kind,
      id: t.id,
      parentId: t.parentId,
      done: t.status === 'done',
    })),
  );
}

// ---- List ---------------------------------------------------------------

export function GoalsScreen() {
  const goals = useGoals();
  const tasks = useTasks() ?? [];
  const spaceMap = useSpaceMap();
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const active = (goals ?? []).filter((g) => g.status === 'active');
  const achieved = (goals ?? []).filter((g) => g.status === 'done');

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle="Work backward from a deadline to a step you can take today."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">New goal</span>
            <span className="sr-only sm:hidden">New goal</span>
          </Button>
        }
      />

      {goals && active.length === 0 && (
        <EmptyState
          title="No goals yet"
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Plan a goal backward
            </Button>
          }
        >
          Big goals feel heavy when you look at them all at once. Starting from the deadline and walking back turns
          them into a clear first step.
        </EmptyState>
      )}

      <ul className="space-y-3">
        {active.map((g) => {
          const gt = tasks.filter((t) => t.goalId === g.id);
          const p = progressOf(gt);
          const nextStep = gt.find((t) => t.kind === 'step' && t.status === 'open');
          const space = spaceMap.get(g.spaceId);
          return (
            <li key={g.id}>
              <Link
                to={`/goals/${g.id}`}
                className="block rounded-3xl bg-surface p-5 shadow-[0_1px_0_var(--line)] transition-colors hover:bg-surface-2"
              >
                <div className="flex items-start gap-3">
                  <SpaceBadge color={space?.color} icon={space?.icon} />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-medium">{g.title}</p>
                    <p className="text-sm text-muted">
                      By {fmt(g.deadline, { month: 'long', day: 'numeric' })} · {timeLeft(g.deadline, today)}
                    </p>
                  </div>
                </div>
                <ProgressBar ratio={p.ratio} label={`${p.done} of ${p.total} done`} />
                {nextStep && <p className="mt-3 text-sm">Next step: {nextStep.title}</p>}
              </Link>
            </li>
          );
        })}
      </ul>

      {achieved.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Achieved</h2>
          <ul className="space-y-2">
            {achieved.map((g) => (
              <li key={g.id}>
                <Link to={`/goals/${g.id}`} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
                  <Check className="size-5 text-accent" aria-hidden="true" />
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GoalWizard open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function ProgressBar({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div className="mt-4">
      <div
        className="h-2 rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Goal progress"
      >
        <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">{label}</p>
    </div>
  );
}

// ---- Detail -------------------------------------------------------------

export function GoalDetailScreen() {
  const { id } = useParams();
  const goals = useGoals();
  const goal = goals?.find((g) => g.id === id);
  const tasks = useGoalTasks(id);
  const navigate = useNavigate();
  const today = todayISO();
  const [editingMilestone, setEditingMilestone] = useState<Task | 'new' | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);

  if (goals && !goal) {
    return (
      <EmptyState title="This goal isn't here anymore" action={<Link to="/goals">Back to goals</Link>} />
    );
  }
  if (!goal) return null;

  const milestones = sortByDate(
    tasks.filter((t) => t.kind === 'milestone').map((t) => ({ ...t, date: t.dueDate ?? goal.deadline })),
  );
  const p = progressOf(tasks);
  const todayIndex = milestones.findIndex((m) => m.date >= today);

  return (
    <>
      <Link to="/goals" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All goals
      </Link>
      <PageHeader
        title={goal.title}
        subtitle={
          <>
            By {fmt(goal.deadline, { weekday: 'long', month: 'long', day: 'numeric' })} · {timeLeft(goal.deadline, today)}
          </>
        }
        actions={
          <IconButton label="Edit goal" onClick={() => setEditingGoal(true)}>
            <Pencil className="size-5" aria-hidden="true" />
          </IconButton>
        }
      />

      {goal.status === 'done' && (
        <div className="mb-6 rounded-3xl bg-accent-soft p-5">
          <p className="text-lg font-medium">You did it.</p>
          <p className="text-sm text-muted">Take a moment to enjoy this one.</p>
        </div>
      )}

      <section className="mb-8 rounded-3xl bg-surface p-5 shadow-[0_1px_0_var(--line)]">
        <ProgressBar ratio={p.ratio} label={`${p.done} of ${p.total} steps and milestones done`} />
        {goal.notes && <p className="mt-4 text-[15px] whitespace-pre-wrap text-muted">{goal.notes}</p>}
      </section>

      <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted uppercase">Timeline</h2>
      <ol className="relative ml-3 border-l-2 border-line pl-6" aria-label="Milestones in order">
        {milestones.map((m, i) => (
          <MilestoneItem
            key={m.id}
            goal={goal}
            milestone={m}
            steps={tasks.filter((t) => t.parentId === m.id)}
            showTodayBefore={i === todayIndex && i > 0}
            today={today}
            onEdit={() => setEditingMilestone(m)}
          />
        ))}
        {todayIndex === -1 && milestones.length > 0 && <TodayMarker />}
        <li className="relative pb-2">
          <span className="absolute top-1 -left-[33px] flex size-4 items-center justify-center rounded-full bg-accent ring-4 ring-bg">
            <Flag className="size-2.5 text-accent-ink" aria-hidden="true" />
          </span>
          <p className="font-medium">Deadline: {fmt(goal.deadline, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
        </li>
      </ol>

      <Button className="mt-4" onClick={() => setEditingMilestone('new')}>
        <Plus className="size-4" aria-hidden="true" />
        Add milestone
      </Button>

      <MilestoneEditor
        goal={goal}
        milestones={milestones}
        milestone={editingMilestone}
        onClose={() => setEditingMilestone(null)}
      />
      <GoalEditor
        goal={goal}
        open={editingGoal}
        onClose={() => setEditingGoal(false)}
        onDeleted={() => navigate('/goals')}
      />
    </>
  );
}

function TodayMarker() {
  return (
    <li className="relative pb-6" aria-label="Today">
      <span className="absolute top-1.5 -left-[31px] size-3 rounded-full bg-leisure ring-4 ring-bg" aria-hidden="true" />
      <p className="text-sm font-medium text-leisure">Today</p>
    </li>
  );
}

function MilestoneItem({
  goal,
  milestone,
  steps,
  showTodayBefore,
  today,
  onEdit,
}: {
  goal: Goal;
  milestone: Task & { date: string };
  steps: Task[];
  showTodayBefore: boolean;
  today: string;
  onEdit: () => void;
}) {
  const done = milestone.status === 'done';
  const [draft, setDraft] = useState('');
  const passed = !done && milestone.date < today;

  return (
    <>
      {showTodayBefore && <TodayMarker />}
      <li className="relative pb-8">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Mark milestone "${milestone.title}" as not reached` : `Mark milestone "${milestone.title}" as reached`}
          onClick={() => repos.setTaskDone(milestone, !done)}
          className={`absolute top-0 -left-[37px] flex size-6 items-center justify-center rounded-full border-2 ring-4 ring-bg ${
            done ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface hover:border-accent'
          }`}
        >
          {done && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
        </button>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className={`font-medium ${done ? 'text-muted line-through' : ''}`}>{milestone.title}</p>
            <p className="text-sm text-muted">
              Target: {fmt(milestone.date, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <IconButton label={`Edit milestone "${milestone.title}"`} onClick={onEdit}>
            <Pencil className="size-4" aria-hidden="true" />
          </IconButton>
        </div>

        {passed && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gentle-soft px-3 py-1 text-sm text-gentle"
          >
            <CalendarClock className="size-4" aria-hidden="true" />
            Plans change. Pick a new date?
          </button>
        )}

        {steps.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {steps.map((s) => (
              <StepRow key={s.id} step={s} />
            ))}
          </ul>
        )}

        {!done && (
          <form
            className="mt-2 flex gap-2"
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              if (!draft.trim()) return;
              await addStep(goal, milestone, draft);
              setDraft('');
            }}
          >
            <label htmlFor={`step-${milestone.id}`} className="sr-only">
              Add a step toward {milestone.title}
            </label>
            <input
              id={`step-${milestone.id}`}
              className={`${inputClass} py-2 text-sm`}
              placeholder={steps.length ? 'Add another step' : 'What is the smallest next step?'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button size="sm" type="submit" disabled={!draft.trim()} aria-label="Add step">
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </form>
        )}
      </li>
    </>
  );
}

function StepRow({ step }: { step: Task }) {
  const today = todayISO();
  const done = step.status === 'done';
  const planned = step.plannedFor === today;
  return (
    <li className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 shadow-[0_1px_0_var(--line)]">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => repos.setTaskDone(step, e.target.checked)}
        aria-label={`Step done: ${step.title}`}
        className="size-5 shrink-0 accent-[var(--accent)]"
      />
      <span className={`flex-1 text-[15px] ${done ? 'text-muted line-through' : ''}`}>{step.title}</span>
      {!done && (
        <>
          <button
            type="button"
            aria-pressed={planned}
            aria-label={planned ? `Remove "${step.title}" from today` : `Add "${step.title}" to today`}
            onClick={() => repos.tasks.update(step.id, { plannedFor: planned ? null : today })}
            className={`inline-flex size-8 items-center justify-center rounded-lg ${planned ? 'text-leisure' : 'text-muted hover:bg-surface-2'}`}
          >
            {planned ? <Sun className="size-4" aria-hidden="true" /> : <SunDim className="size-4" aria-hidden="true" />}
          </button>
          <Link
            to={`/focus?task=${step.id}`}
            aria-label={`Start a focus block on "${step.title}"`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-accent hover:bg-accent-soft"
          >
            <Play className="size-4" aria-hidden="true" />
          </Link>
        </>
      )}
    </li>
  );
}

// ---- Milestone editor with gentle re-flow --------------------------------

function MilestoneEditor({
  goal,
  milestones,
  milestone,
  onClose,
}: {
  goal: Goal;
  milestones: (Task & { date: string })[];
  milestone: Task | 'new' | null;
  onClose: () => void;
}) {
  const isNew = milestone === 'new';
  const current = milestone && milestone !== 'new' ? milestone : null;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [reflow, setReflow] = useState<{ push: Reflow; keep: Reflow | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!milestone) return;
    setTitle(current?.title ?? '');
    setDate(current?.dueDate ?? goal.deadline);
    setReflow(null);
    setConfirmDelete(false);
  }, [milestone, current, goal.deadline]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    if (isNew) {
      await addMilestone(goal, title, date);
      onClose();
      return;
    }
    if (!current) return;
    await repos.tasks.update(current.id, { title: title.trim() });
    const items = milestones.map((m) => ({ id: m.id, date: m.date }));
    if (needsReflow(items, current.id, date)) {
      setReflow({
        push: reflowPush(items, current.id, date, goal.deadline),
        keep: reflowKeepDeadline(items, current.id, date, goal.deadline),
      });
      return;
    }
    await repos.tasks.update(current.id, { dueDate: date });
    if (date > goal.deadline) await repos.goals.update(goal.id, { deadline: date });
    onClose();
  }

  async function choose(r: Reflow | 'only') {
    if (!current) return;
    if (r === 'only') {
      await repos.tasks.update(current.id, { dueDate: date });
      if (date > goal.deadline) await repos.goals.update(goal.id, { deadline: date });
    } else {
      await applyDates(goal, r.dates, r.deadline);
    }
    onClose();
  }

  const titleOf = (id: string) => milestones.find((m) => m.id === id)?.title ?? '';

  return (
    <Sheet
      open={!!milestone}
      onClose={onClose}
      title={reflow ? 'Adjust the rest of the plan?' : isNew ? 'New milestone' : 'Edit milestone'}
      footer={
        reflow ? undefined : (
          <>
            {current &&
              (confirmDelete ? (
                <Button
                  onClick={async () => {
                    await repos.tasks.remove(current.id);
                    onClose();
                  }}
                >
                  Yes, remove
                </Button>
              ) : (
                <IconButton label="Remove milestone" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-5" aria-hidden="true" />
                </IconButton>
              ))}
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="milestone-form" disabled={!title.trim() || !date}>
              Save
            </Button>
          </>
        )
      }
    >
      {reflow ? (
        <div className="space-y-4 pb-4">
          <p className="text-[15px]">
            Plans change. That's normal and nothing to worry about. How should the milestones after this one adjust?
          </p>
          <ReflowOption
            title="Push the rest back"
            description={
              reflow.push.deadline !== goal.deadline
                ? `Everything after moves by the same amount. New deadline: ${fmt(reflow.push.deadline)}.`
                : 'Everything after moves by the same amount.'
            }
            dates={reflow.push.dates}
            titleOf={titleOf}
            onChoose={() => choose(reflow.push)}
          />
          {reflow.keep ? (
            <ReflowOption
              title="Keep the deadline"
              description={`Spread the remaining milestones evenly before ${fmt(goal.deadline)}.`}
              dates={reflow.keep.dates}
              titleOf={titleOf}
              onChoose={() => choose(reflow.keep!)}
            />
          ) : (
            <p className="text-sm text-muted">
              The new date is after the deadline, so keeping the deadline isn't possible this time.
            </p>
          )}
          <Button variant="ghost" onClick={() => choose('only')}>
            Only move this milestone
          </Button>
        </div>
      ) : (
        <form id="milestone-form" onSubmit={save} className="space-y-4 pt-1">
          <Field label="Milestone">
            {(id) => (
              <input id={id} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            )}
          </Field>
          <Field label="Target date">
            {(id) => (
              <input id={id} type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            )}
          </Field>
        </form>
      )}
    </Sheet>
  );
}

function ReflowOption({
  title,
  description,
  dates,
  titleOf,
  onChoose,
}: {
  title: string;
  description: string;
  dates: Record<string, string>;
  titleOf: (id: string) => string;
  onChoose: () => void;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted">{description}</p>
      <ul className="mt-2 space-y-0.5 text-sm">
        {Object.entries(dates)
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([id, d]) => (
            <li key={id} className="flex justify-between gap-3">
              <span className="truncate">{titleOf(id)}</span>
              <span className="shrink-0 text-muted tabular-nums">{fmt(d)}</span>
            </li>
          ))}
      </ul>
      <Button variant="primary" size="sm" className="mt-3" onClick={onChoose}>
        Use this plan
      </Button>
    </div>
  );
}

// ---- Goal editor --------------------------------------------------------

function GoalEditor({
  goal,
  open,
  onClose,
  onDeleted,
}: {
  goal: Goal;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const spaces = useSpaces() ?? [];
  const [title, setTitle] = useState(goal.title);
  const [deadline, setDeadline] = useState(goal.deadline);
  const [notes, setNotes] = useState(goal.notes);
  const [spaceId, setSpaceId] = useState(goal.spaceId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(goal.title);
    setDeadline(goal.deadline);
    setNotes(goal.notes);
    setSpaceId(goal.spaceId);
    setConfirmDelete(false);
  }, [open, goal]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !deadline) return;
    await repos.goals.update(goal.id, { title: title.trim(), deadline, notes, spaceId });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit goal"
      footer={
        <>
          {confirmDelete ? (
            <Button
              onClick={async () => {
                await deleteGoal(goal);
                onClose();
                onDeleted();
              }}
            >
              Delete goal and its steps
            </Button>
          ) : (
            <IconButton label="Delete goal" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-5" aria-hidden="true" />
            </IconButton>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="goal-form">
            Save
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={save} className="space-y-4 pt-1">
        <Field label="Goal">
          {(id) => <input id={id} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field label="Deadline">
          {(id) => (
            <input id={id} type="date" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          )}
        </Field>
        <Field label="Space">
          {(id) => (
            <select id={id} className={inputClass} value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Notes" hint="Why this matters to you can help on harder days">
          {(id) => (
            <textarea id={id} className={`${inputClass} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          )}
        </Field>
        <label className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
          <input
            type="checkbox"
            checked={goal.status === 'done'}
            onChange={(e) => repos.goals.update(goal.id, { status: e.target.checked ? 'done' : 'active' })}
            className="size-5 accent-[var(--accent)]"
          />
          I've achieved this goal
        </label>
      </form>
    </Sheet>
  );
}
