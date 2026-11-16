/// <reference lib="webworker" />
/**
 * Watches for the end of a timed phase. Browsers throttle timers in
 * background tabs much less inside workers, so the end-of-block chime and
 * notification arrive on time. The worker only signals; the app derives the
 * actual remaining time from the clock.
 */
let timer: ReturnType<typeof setInterval> | undefined;

self.onmessage = (e: MessageEvent<{ endsAt: number | null }>) => {
  if (timer) clearInterval(timer);
  timer = undefined;
  const endsAt = e.data.endsAt;
  if (!endsAt) return;
  timer = setInterval(() => {
    if (Date.now() >= endsAt) {
      clearInterval(timer);
      timer = undefined;
      self.postMessage('due');
    }
  }, 250);
};
