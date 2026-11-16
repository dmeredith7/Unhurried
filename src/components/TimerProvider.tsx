/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSettings } from '../data/hooks';
import * as repos from '../data/repos';
import type { WorkBlock } from '../data/types';
import * as T from '../domain/timer';
import { notify, playChime, requestNotificationPermission, unlockAudio } from '../lib/alerts';
import { newId } from '../lib/ids';

const STORE_KEY = 'focusSession';

interface TimerApi {
  session: T.FocusSession | null;
  /** Current time, refreshed while a block is running. */
  now: number;
  /** The block just logged, shown on the reward-break screen. */
  lastBlock: WorkBlock | null;
  /** True if the block ended while the app was closed. */
  endedWhileAway: boolean;
  start(opts: { taskId: string | null; label: string; minutes: number; warmUp: boolean }): Promise<void>;
  skipWarmup(): void;
  pause(): void;
  resume(): void;
  endEarly(): void;
  discard(): void;
  saveReview(r: { quality: number; note: string; markTaskDone: boolean }): Promise<void>;
  clearBreak(): void;
}

const TimerContext = createContext<TimerApi | null>(null);

export function useTimer(): TimerApi {
  const api = useContext(TimerContext);
  if (!api) throw new Error('useTimer must be used inside TimerProvider');
  return api;
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [session, setSession] = useState<T.FocusSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [lastBlock, setLastBlock] = useState<WorkBlock | null>(null);
  const [endedWhileAway, setEndedWhileAway] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Persist every change so a reload or crash never loses a block.
  const update = useCallback((next: T.FocusSession | null) => {
    setSession(next);
    void repos.meta.set(STORE_KEY, next);
  }, []);

  // Restore on load, catching up on anything that finished while closed.
  useEffect(() => {
    repos.meta.get<T.FocusSession | null>(STORE_KEY).then((stored) => {
      if (stored) {
        const caught = T.catchUp(stored, Date.now());
        if (caught.phase === 'review' && stored.phase !== 'review') setEndedWhileAway(true);
        update(caught);
      }
      setLoaded(true);
    });
  }, [update]);

  const sessionRef = useRef<T.FocusSession | null>(null);
  sessionRef.current = session;

  const advance = useCallback(() => {
    const cur = sessionRef.current;
    const t = Date.now();
    if (!cur || !T.isDue(cur, t)) return;
    if (cur.phase === 'warmup') {
      const next = T.beginFocus(cur, t);
      sessionRef.current = next;
      update(next);
      return;
    }
    const next = T.finish(cur, t);
    sessionRef.current = next; // guard against a second trigger before re-render
    update(next);
    const s = settingsRef.current;
    if (s.sound) playChime();
    if (s.notifications) void notify('Block complete', 'Nice work. Time for a reward break.');
  }, [update]);

  // Background-safe end detection: a worker (less throttled) plus a fallback.
  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    try {
      const w = new Worker(new URL('../lib/timer.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = () => advance();
      workerRef.current = w;
      return () => w.terminate();
    } catch {
      workerRef.current = null;
    }
  }, [advance]);

  const running = !!session && session.phase !== 'review' && !T.isPaused(session);
  const endsAt = running ? session.endsAt : null;

  useEffect(() => {
    workerRef.current?.postMessage({ endsAt });
    if (!endsAt) return;
    const fallback = setTimeout(advance, Math.max(0, endsAt - Date.now()) + 50);
    return () => clearTimeout(fallback);
  }, [endsAt, advance]);

  // Smooth on-screen ticking while visible; recompute on returning to the tab.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setNow(Date.now());
      advance();
    }, 250);
    const onVisible = () => {
      setNow(Date.now());
      advance();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, advance]);

  // Show the time left in the tab title.
  useEffect(() => {
    const base = 'Unhurried';
    if (session && session.phase !== 'review') {
      const label = session.phase === 'warmup' ? 'Warm-up' : T.isPaused(session) ? 'Paused' : 'Focus';
      document.title = `${T.formatClock(T.remainingMs(session, now))} · ${label} · ${base}`;
    } else if (session?.phase === 'review') {
      document.title = `Block complete · ${base}`;
    } else {
      document.title = base;
    }
  }, [session, now]);

  const api: TimerApi = {
    session: loaded ? session : null,
    now,
    lastBlock,
    endedWhileAway,
    async start({ taskId, label, minutes, warmUp }) {
      unlockAudio(); // must happen during the tap
      if (settingsRef.current.notifications) void requestNotificationPermission();
      setLastBlock(null);
      setEndedWhileAway(false);
      const t = Date.now();
      setNow(t);
      update(T.startSession({ id: newId(), taskId, label, minutes, warmUp, now: t }));
    },
    skipWarmup() {
      if (session?.phase !== 'warmup') return;
      const t = Date.now();
      setNow(t);
      update(T.beginFocus(session, t));
    },
    pause() {
      if (session) update(T.pause(session, Date.now()));
    },
    resume() {
      if (!session) return;
      const t = Date.now();
      setNow(t);
      update(T.resume(session, t));
    },
    endEarly() {
      if (!session) return;
      if (session.phase === 'warmup') return update(null);
      update(T.finish(session, Date.now(), true));
    },
    discard() {
      update(null);
      setEndedWhileAway(false);
    },
    async saveReview({ quality, note, markTaskDone }) {
      if (!session || session.phase !== 'review') return;
      const task = session.taskId ? await repos.tasks.get(session.taskId) : undefined;
      const minutes = session.actualMinutes ?? 0;
      const endedAt = session.endedAt ?? Date.now();
      const block = await repos.blocks.create({
        taskId: session.taskId,
        spaceId: task?.spaceId ?? null,
        label: task?.title ?? session.label,
        startedAt: session.focusStartedAt ?? endedAt - minutes * 60_000,
        endedAt,
        plannedMinutes: session.plannedMinutes,
        actualMinutes: minutes,
        quality,
        note: note.trim(),
        warmUp: session.warmUp,
      });
      if (task && markTaskDone && task.status === 'open') await repos.setTaskDone(task, true);
      setLastBlock(block);
      setEndedWhileAway(false);
      update(null);
    },
    clearBreak() {
      setLastBlock(null);
    },
  };

  return <TimerContext.Provider value={api}>{children}</TimerContext.Provider>;
}
