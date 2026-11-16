/**
 * Focus-block timer logic.
 *
 * The timer never counts ticks. It stores *when* the current phase ends and
 * derives the remaining time from the clock, so it stays correct when the
 * tab is throttled in the background, the device sleeps, or the page reloads.
 */

export type SessionPhase = 'warmup' | 'focus' | 'review';

export interface FocusSession {
  id: string;
  taskId: string | null;
  label: string;
  plannedMinutes: number;
  warmUp: boolean;
  phase: SessionPhase;
  /** When the current timed phase (warm-up or focus) ends, epoch ms. */
  endsAt: number;
  /** When focus actually began (after any warm-up), epoch ms. */
  focusStartedAt: number | null;
  /** Set while paused: the time that was left when pausing. */
  pausedRemainingMs: number | null;
  /** When the session reached review. */
  endedAt: number | null;
  /** Minutes of focus actually done (set on reaching review). */
  actualMinutes: number | null;
  /** True if the block ran to the end (vs. ended early). */
  completed: boolean;
}

export const WARMUP_MS = 2 * 60_000;

export function startSession(opts: {
  id: string;
  taskId: string | null;
  label: string;
  minutes: number;
  warmUp: boolean;
  now: number;
}): FocusSession {
  const base = {
    id: opts.id,
    taskId: opts.taskId,
    label: opts.label,
    plannedMinutes: opts.minutes,
    warmUp: opts.warmUp,
    pausedRemainingMs: null,
    endedAt: null,
    actualMinutes: null,
    completed: false,
  };
  return opts.warmUp
    ? { ...base, phase: 'warmup', endsAt: opts.now + WARMUP_MS, focusStartedAt: null }
    : { ...base, phase: 'focus', endsAt: opts.now + opts.minutes * 60_000, focusStartedAt: opts.now };
}

/** Begin focus now (after the warm-up ends or is skipped). */
export function beginFocus(s: FocusSession, now: number): FocusSession {
  return {
    ...s,
    phase: 'focus',
    focusStartedAt: now,
    endsAt: now + s.plannedMinutes * 60_000,
    pausedRemainingMs: null,
  };
}

export function remainingMs(s: FocusSession, now: number): number {
  if (s.phase === 'review') return 0;
  if (s.pausedRemainingMs !== null) return s.pausedRemainingMs;
  return Math.max(0, s.endsAt - now);
}

export function isPaused(s: FocusSession): boolean {
  return s.pausedRemainingMs !== null;
}

export function pause(s: FocusSession, now: number): FocusSession {
  if (s.phase !== 'focus' || isPaused(s)) return s;
  return { ...s, pausedRemainingMs: remainingMs(s, now) };
}

export function resume(s: FocusSession, now: number): FocusSession {
  if (!isPaused(s)) return s;
  return { ...s, endsAt: now + (s.pausedRemainingMs ?? 0), pausedRemainingMs: null };
}

/** Whether the current timed phase is over (and the app should advance). */
export function isDue(s: FocusSession, now: number): boolean {
  return (s.phase === 'warmup' || s.phase === 'focus') && !isPaused(s) && now >= s.endsAt;
}

/**
 * Move to review. When the block ran out, it counts as the full planned
 * length (even if the tab was asleep when it ended). When ended early,
 * it counts the focus time actually done.
 */
export function finish(s: FocusSession, now: number, early = false): FocusSession {
  const plannedMs = s.plannedMinutes * 60_000;
  const doneMs = early ? plannedMs - remainingMs(s, now) : plannedMs;
  return {
    ...s,
    phase: 'review',
    endedAt: early ? now : Math.min(now, s.endsAt),
    actualMinutes: Math.max(0, Math.round(doneMs / 60_000)),
    pausedRemainingMs: null,
    completed: !early,
  };
}

/**
 * Bring a stored session up to date (e.g. after a reload): finish a warm-up
 * that ran out and a focus phase that ran out.
 */
export function catchUp(s: FocusSession, now: number): FocusSession {
  let cur = s;
  if (cur.phase === 'warmup' && isDue(cur, now)) cur = beginFocus(cur, cur.endsAt);
  if (cur.phase === 'focus' && isDue(cur, now)) cur = finish(cur, now);
  return cur;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
