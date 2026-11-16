import { describe, expect, it } from 'vitest';
import {
  WARMUP_MS,
  beginFocus,
  catchUp,
  finish,
  formatClock,
  isDue,
  pause,
  remainingMs,
  resume,
  startSession,
} from './timer';

const MIN = 60_000;
const T0 = 1_000_000_000_000;
const start = (warmUp = false) =>
  startSession({ id: 'a', taskId: null, label: 'x', minutes: 30, warmUp, now: T0 });

describe('timer', () => {
  it('derives remaining time from the clock, not ticks', () => {
    const s = start();
    expect(remainingMs(s, T0)).toBe(30 * MIN);
    // A background tab that wakes up 12 minutes later is still exact.
    expect(remainingMs(s, T0 + 12 * MIN)).toBe(18 * MIN);
    expect(remainingMs(s, T0 + 40 * MIN)).toBe(0);
  });

  it('pauses and resumes without losing time', () => {
    let s = start();
    s = pause(s, T0 + 10 * MIN);
    expect(remainingMs(s, T0 + 25 * MIN)).toBe(20 * MIN); // frozen while paused
    expect(isDue(s, T0 + 60 * MIN)).toBe(false);
    s = resume(s, T0 + 25 * MIN);
    expect(remainingMs(s, T0 + 30 * MIN)).toBe(15 * MIN);
    expect(isDue(s, T0 + 45 * MIN)).toBe(true);
  });

  it('runs the warm-up before focus', () => {
    let s = start(true);
    expect(s.phase).toBe('warmup');
    expect(remainingMs(s, T0)).toBe(WARMUP_MS);
    s = beginFocus(s, T0 + 30_000); // skipped after 30s
    expect(s.phase).toBe('focus');
    expect(remainingMs(s, T0 + 30_000)).toBe(30 * MIN);
  });

  it('logs the full block when it runs out, even if noticed late', () => {
    const s = finish(start(), T0 + 45 * MIN);
    expect(s.phase).toBe('review');
    expect(s.actualMinutes).toBe(30);
    expect(s.completed).toBe(true);
    expect(s.endedAt).toBe(T0 + 30 * MIN);
  });

  it('logs only the time done when ended early', () => {
    const s = finish(start(), T0 + 12 * MIN, true);
    expect(s.actualMinutes).toBe(12);
    expect(s.completed).toBe(false);
  });

  it('catches up after the page was closed through warm-up and focus', () => {
    const s = catchUp(start(true), T0 + WARMUP_MS + 31 * MIN);
    expect(s.phase).toBe('review');
    expect(s.actualMinutes).toBe(30);
    expect(s.focusStartedAt).toBe(T0 + WARMUP_MS);
  });

  it('leaves a running block alone when catching up early', () => {
    const s = catchUp(start(), T0 + 5 * MIN);
    expect(s.phase).toBe('focus');
  });

  it('formats the clock', () => {
    expect(formatClock(30 * MIN)).toBe('30:00');
    expect(formatClock(61_500)).toBe('1:02');
    expect(formatClock(0)).toBe('0:00');
  });
});
