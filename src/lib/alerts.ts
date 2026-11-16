/** Sound and notifications for the end of a focus block. */

let ctx: AudioContext | null = null;

/** Call from a user gesture (e.g. tapping Start) so sound can play later. */
export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** A soft, rising three-note chime (no alarm sounds). */
export function playChime(): void {
  if (!ctx) unlockAudio();
  const c = ctx;
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const t0 = c.currentTime + 0.05;
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = t0 + i * 0.28;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 1.7);
  });
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function notify(title: string, body: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const icon = `${import.meta.env.BASE_URL}icon.svg`;
  try {
    // Installed apps (and Android) require notifications via the service worker.
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) {
      await reg.showNotification(title, { body, icon, tag: 'unhurried-block' });
      return;
    }
    new Notification(title, { body, icon, tag: 'unhurried-block' });
  } catch {
    /* Notifications are a nicety; the in-app screen still shows the end. */
  }
}
