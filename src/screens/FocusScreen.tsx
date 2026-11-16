import { Coffee, Pause, Play, RefreshCw, Shuffle, SkipForward, Square, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTimer } from '../components/TimerProvider';
import { Button, Field, PageHeader, Toggle, inputClass } from '../components/ui';
import { useBlocks, useBreakIdeas, useSettings, useSpaceMap, useTasks } from '../data/hooks';
import * as repos from '../data/repos';
import type { Task, WorkBlock } from '../data/types';
import { randomReframe } from '../domain/reframes';
import * as T from '../domain/timer';
import { todayISO, toISODate } from '../lib/dates';
import { spaceHex } from '../lib/spaceStyle';

const LENGTHS = [15, 25, 30, 45, 60];

export const QUALITY_LABELS = ['Scattered', 'Some focus', 'Steady', 'Good flow', 'Deep flow'];

export function FocusScreen() {
  const { session, lastBlock } = useTimer();
  const stage = session?.phase ?? (lastBlock ? 'break' : 'setup');
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);
  if (session?.phase === 'warmup') return <WarmUp />;
  if (session?.phase === 'focus') return <Focusing />;
  if (session?.phase === 'review') return <Review />;
  if (lastBlock) return <RewardBreak block={lastBlock} />;
  return <Setup />;
}

// ---- Setup --------------------------------------------------------------

function Setup() {
  const settings = useSettings();
  const tasks = useTasks() ?? [];
  const timer = useTimer();
  const [params] = useSearchParams();
  const [taskId, setTaskId] = useState<string>(params.get('task') ?? '');
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState(settings.blockMinutes);
  const [warmUp, setWarmUp] = useState(settings.warmUp);
  const reframe = useMemo(() => randomReframe(), []);
  const today = todayISO();

  // Settings load asynchronously; adopt them once they arrive.
  useEffect(() => {
    setMinutes(settings.blockMinutes);
  }, [settings.blockMinutes]);
  useEffect(() => {
    setWarmUp(settings.warmUp);
  }, [settings.warmUp]);

  const open = tasks.filter((t) => t.status === 'open' && t.kind !== 'milestone');
  const todays = open.filter((t) => t.plannedFor === today || t.dueDate === today);
  const others = open.filter((t) => !todays.includes(t)).sort((a, b) => a.title.localeCompare(b.title));
  const task = open.find((t) => t.id === taskId);

  return (
    <>
      <PageHeader title="Focus" subtitle="One block at a time. Starting is the whole job." />

      <section className="rounded-3xl bg-surface p-5 shadow-[0_1px_0_var(--line)]">
        <div className="space-y-5">
          <Field label="What will you work on?">
            {(id) => (
              <select id={id} className={inputClass} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">A free block (no task)</option>
                {todays.length > 0 && (
                  <optgroup label="Today">
                    {todays.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                {others.length > 0 && (
                  <optgroup label="Other tasks">
                    {others.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </Field>

          {!task && (
            <Field label="Label" hint="Optional, e.g. Reading or Email">
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="What's this block for?"
                />
              )}
            </Field>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Length</legend>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([...LENGTHS, settings.blockMinutes]))
                .sort((a, b) => a - b)
                .map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={minutes === m}
                    onClick={() => setMinutes(m)}
                    className={`h-10 rounded-full px-4 text-sm transition-colors ${
                      minutes === m ? 'bg-ink text-bg' : 'bg-surface-2 text-ink hover:bg-line'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
            </div>
          </fieldset>

          <Toggle
            label="Flow warm-up first"
            description="Two minutes of slow breathing to settle in. You can skip it anytime."
            checked={warmUp}
            onChange={setWarmUp}
          />
        </div>

        {settings.reframes && (
          <p className="mt-2 rounded-2xl bg-leisure-soft px-4 py-3 text-sm">
            Instead of "{reframe.from}", try "{reframe.to}".
          </p>
        )}

        <Button
          variant="primary"
          className="mt-5 w-full"
          onClick={() =>
            timer.start({
              taskId: task?.id ?? null,
              label: task?.title ?? (label.trim() || 'Free block'),
              minutes,
              warmUp,
            })
          }
        >
          <Play className="size-5" aria-hidden="true" />
          {warmUp ? 'Begin warm-up' : `Start ${minutes}-minute block`}
        </Button>
      </section>

      <RecentBlocks />
    </>
  );
}

function RecentBlocks() {
  const blocks = useBlocks() ?? [];
  const spaceMap = useSpaceMap();
  const today = todayISO();
  const todays = blocks.filter((b) => toISODate(new Date(b.startedAt)) === today);
  const minutes = todays.reduce((n, b) => n + b.actualMinutes, 0);
  const recent = blocks.slice(0, 10);
  const [confirm, setConfirm] = useState<string | null>(null);

  if (blocks.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-muted">
        Your finished blocks will appear here. Each one counts.
      </p>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted uppercase">Your blocks</h2>
      {todays.length > 0 && (
        <p className="mb-3 text-[15px]">
          Today: {todays.length} {todays.length === 1 ? 'block' : 'blocks'}, {formatMinutes(minutes)} of focused
          work.
        </p>
      )}
      <ul className="space-y-2">
        {recent.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[0_1px_0_var(--line)]">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: spaceHex(b.spaceId ? spaceMap.get(b.spaceId)?.color : 'slate') }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate">{b.label || 'Free block'}</p>
              <p className="text-xs text-muted">
                {new Date(b.startedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}{' '}
                · {b.actualMinutes} min · {QUALITY_LABELS[b.quality - 1]}
                {b.note ? ` · ${b.note}` : ''}
              </p>
            </div>
            {confirm === b.id ? (
              <Button size="sm" onClick={() => repos.blocks.remove(b.id)}>
                Remove
              </Button>
            ) : (
              <button
                type="button"
                aria-label={`Remove block "${b.label}"`}
                onClick={() => setConfirm(b.id)}
                className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- Warm-up ------------------------------------------------------------

const WARMUP_CUES = [
  'Let your shoulders drop.',
  'Let go of whatever happened earlier today.',
  'Let go of what comes later. Only this block matters.',
  'Picture yourself starting, easily and calmly.',
  'You only need to begin. Whatever you do is enough.',
  'When you are ready, the block will start on its own.',
];

function WarmUp() {
  const { session, now, skipWarmup, endEarly } = useTimer();
  if (!session) return null;
  const left = T.remainingMs(session, now);
  const elapsed = T.WARMUP_MS - left;
  const breathingIn = Math.floor(elapsed / 4000) % 2 === 0;
  const cue = WARMUP_CUES[Math.min(WARMUP_CUES.length - 1, Math.floor(elapsed / 20_000))];

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">Flow warm-up</p>
      <div className="relative my-10 flex size-60 items-center justify-center" aria-hidden="true">
        <div className="breathe absolute inset-0 rounded-full bg-accent-soft" />
        <div className="breathe absolute inset-8 rounded-full bg-accent/20" />
        <span className="relative text-xl font-medium">{breathingIn ? 'Breathe in' : 'Breathe out'}</span>
      </div>
      <p className="max-w-sm text-lg" aria-live="polite">
        {cue}
      </p>
      <p className="mt-3 text-sm text-muted tabular-nums">
        {T.formatClock(left)} until your {session.plannedMinutes}-minute block
        {session.label ? ` on "${session.label}"` : ''}
      </p>
      <div className="mt-8 flex gap-2">
        <Button variant="primary" onClick={skipWarmup}>
          <SkipForward className="size-4" aria-hidden="true" />
          Start the block now
        </Button>
        <Button variant="ghost" onClick={endEarly}>
          Not now
        </Button>
      </div>
    </div>
  );
}

// ---- Focusing -----------------------------------------------------------

function Focusing() {
  const { session, now, pause, resume, endEarly, discard } = useTimer();
  const tasks = useTasks();
  const [confirmStop, setConfirmStop] = useState(false);
  if (!session) return null;
  const task = tasks?.find((t) => t.id === session.taskId);
  const left = T.remainingMs(session, now);
  const total = session.plannedMinutes * 60_000;
  const progress = 1 - left / total;
  const paused = T.isPaused(session);
  const r = 110;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center pt-4 text-center">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">{paused ? 'Paused' : 'Focusing on'}</p>
      <h1 className="mt-1 max-w-md text-xl font-semibold">{session.label}</h1>

      <div className="relative my-8 size-64">
        <svg viewBox="0 0 240 240" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="120" cy="120" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
          <circle
            cx="120"
            cy="120"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light tabular-nums" role="timer" aria-label={`${Math.ceil(left / 60000)} minutes left`}>
            {T.formatClock(left)}
          </span>
          <span className="mt-1 text-sm text-muted">of {session.plannedMinutes} min</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {paused ? (
          <Button variant="primary" onClick={resume}>
            <Play className="size-4" aria-hidden="true" />
            Resume
          </Button>
        ) : (
          <Button onClick={pause}>
            <Pause className="size-4" aria-hidden="true" />
            Pause
          </Button>
        )}
        <Button variant="ghost" onClick={() => setConfirmStop(true)}>
          <Square className="size-4" aria-hidden="true" />
          End block
        </Button>
      </div>

      {confirmStop && (
        <div className="mt-4 w-full max-w-sm rounded-2xl bg-surface p-4 text-left shadow-[0_1px_0_var(--line)]">
          <p className="text-[15px]">Ending early is fine. What you did still counts.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={endEarly}>
              End and log it
            </Button>
            <Button size="sm" onClick={discard}>
              End without logging
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmStop(false)}>
              Keep going
            </Button>
          </div>
        </div>
      )}

      {task && task.subtasks.length > 0 && <StepChecklist task={task} />}

      <p className="mt-10 max-w-sm text-sm text-muted">
        You can leave this screen or switch tabs. The timer keeps going and will let you know when the block ends.
      </p>
    </div>
  );
}

function StepChecklist({ task }: { task: Task }) {
  return (
    <section className="mt-8 w-full max-w-sm text-left">
      <h2 className="mb-2 text-sm font-semibold text-muted">Steps</h2>
      <ul className="space-y-1">
        {task.subtasks.map((s) => (
          <li key={s.id}>
            <label className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface">
              <input
                type="checkbox"
                checked={s.done}
                onChange={(e) =>
                  repos.tasks.update(task.id, {
                    subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: e.target.checked } : x)),
                  })
                }
                className="size-5 accent-[var(--accent)]"
              />
              <span className={s.done ? 'text-muted line-through' : ''}>{s.title}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- Review -------------------------------------------------------------

function Review() {
  const { session, saveReview, discard, endedWhileAway } = useTimer();
  const tasks = useTasks();
  const [quality, setQuality] = useState(0);
  const [note, setNote] = useState('');
  const [markDone, setMarkDone] = useState(false);
  if (!session) return null;
  const task = tasks?.find((t) => t.id === session.taskId);

  return (
    <div className="mx-auto max-w-md pt-4">
      <p className="text-sm font-medium tracking-wide text-accent uppercase">Block complete</p>
      <h1 className="mt-1 text-2xl font-semibold">
        {session.completed ? 'You did it.' : 'Nice, you started.'} {session.actualMinutes} minutes of focus.
      </h1>
      {endedWhileAway && (
        <p className="mt-2 text-sm text-muted">This block finished while the app was closed. It still counts.</p>
      )}

      <fieldset className="mt-8">
        <legend className="mb-3 font-medium">How was the quality of your focus?</legend>
        <div className="grid grid-cols-5 gap-2">
          {QUALITY_LABELS.map((l, i) => (
            <label
              key={l}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 px-1 py-3 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                quality === i + 1 ? 'border-accent bg-accent-soft' : 'border-transparent bg-surface'
              }`}
            >
              <input
                type="radio"
                name="quality"
                className="sr-only"
                checked={quality === i + 1}
                onChange={() => setQuality(i + 1)}
              />
              <span className="text-xl font-semibold tabular-nums">{i + 1}</span>
              <span className="text-[11px] leading-tight text-muted">{l}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Every rating is useful. A scattered block is still a block you showed up for.</p>
      </fieldset>

      <div className="mt-6">
        <Field label="A note for yourself" hint="Optional: what went well, or where to pick up next time">
          {(id) => (
            <textarea id={id} className={`${inputClass} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </div>

      {task && task.status === 'open' && (
        <label className="mt-4 flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
          <input
            type="checkbox"
            checked={markDone}
            onChange={(e) => setMarkDone(e.target.checked)}
            className="size-5 accent-[var(--accent)]"
          />
          Mark "{task.title}" as done
        </label>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={!quality}
          onClick={() => saveReview({ quality, note, markTaskDone: markDone })}
        >
          Log this block
        </Button>
        <Button variant="ghost" onClick={discard}>
          Don't log it
        </Button>
      </div>
    </div>
  );
}

// ---- Reward break -------------------------------------------------------

function RewardBreak({ block }: { block: WorkBlock }) {
  const ideas = useBreakIdeas() ?? [];
  const { clearBreak } = useTimer();
  const navigate = useNavigate();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * 1000));
  const idea = ideas.length ? ideas[index % ideas.length].text : 'Stand up and stretch';

  return (
    <div className="mx-auto max-w-md pt-4 text-center">
      <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-leisure-soft text-leisure" aria-hidden="true">
        <Coffee className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold">Time for a reward</h1>
      <p className="mt-2 text-muted">
        {block.actualMinutes} minutes of focus, logged. You've earned a real break. No guilt, no checking email.
      </p>

      <div className="mt-8 rounded-3xl bg-leisure-soft p-6">
        <p className="text-sm font-medium text-leisure">How about</p>
        <p className="mt-1 text-xl font-medium" aria-live="polite">
          {idea}
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setIndex((i) => i + 1)}>
          <Shuffle className="size-4" aria-hidden="true" />
          Another idea
        </Button>
      </div>
      <Link to="/settings#break-ideas" className="mt-3 inline-block text-sm text-muted underline underline-offset-2">
        Edit your break ideas
      </Link>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="primary"
          onClick={() => {
            clearBreak();
            navigate(block.taskId ? `/focus?task=${block.taskId}` : '/focus');
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          After my break: another block
        </Button>
        <Button
          onClick={() => {
            clearBreak();
            navigate('/');
          }}
        >
          I'm done for now
        </Button>
      </div>
    </div>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
