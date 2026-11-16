/**
 * Self-talk reframes from The Now Habit. Light-touch: we suggest, never
 * correct, and the user can turn them off in Settings.
 */

export interface Reframe {
  from: string;
  to: string;
  /** Optional rewrite of the user's own wording. */
  rewrite?: (title: string) => string;
}

const OBLIGATION = /\b(i\s+)?(have to|need to|must|should|ought to|gotta|got to)\b/i;

/** Suggest a reframe for a task title, or null if nothing applies. */
export function reframeForTitle(title: string, estimateBlocks = 1): Reframe | null {
  const t = title.trim();
  if (OBLIGATION.test(t)) {
    return {
      from: '"I have to"',
      to: '"I choose to"',
      rewrite: (s) =>
        s.replace(OBLIGATION, (_m, i: string | undefined) => (i ? i + 'choose to' : 'choose to')).replace(/^choose/, 'Choose'),
    };
  }
  if (/\b(finish|complete|done with)\b/i.test(t)) {
    return { from: '"I must finish"', to: '"When can I start?"' };
  }
  if (estimateBlocks >= 4) {
    return {
      from: '"This is too big"',
      to: '"I can take one small step." Try adding a tiny first step as a subtask.',
    };
  }
  return null;
}

/** General reframes, shown e.g. when starting a block. */
export const GENERAL_REFRAMES: Reframe[] = [
  { from: 'I have to', to: 'I choose to' },
  { from: 'I must finish', to: 'When can I start?' },
  { from: 'This is too big', to: 'I can take one small step' },
  { from: 'It has to be perfect', to: 'I can be perfectly human' },
  { from: "I don't have time to play", to: 'I must make time to play' },
];

export function randomReframe(seed = Math.random()): Reframe {
  return GENERAL_REFRAMES[Math.floor(seed * GENERAL_REFRAMES.length) % GENERAL_REFRAMES.length];
}
