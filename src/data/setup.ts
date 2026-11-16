/**
 * First-run setup. There is no sample data: new users get a short guide
 * (see GettingStarted.tsx) and choose their own starting spaces.
 */
import * as repos from './repos';
import type { SpaceColor } from './types';
import { todayISO } from '../lib/dates';

const ONBOARDED = 'onboarded';
const DEFAULTS = 'defaultsV1';

export const DEFAULT_BREAK_IDEAS = [
  'Take a short walk',
  'Stretch for a few minutes',
  'Make a cup of tea',
  'Call or text a friend',
  'Step outside for fresh air',
  'Listen to a favorite song',
  'Have a healthy snack',
  'Rest your eyes and look out the window',
];

export interface StarterSpace {
  key: string;
  name: string;
  color: SpaceColor;
  icon: string;
  fields?: { name: string; type: 'text' | 'select'; options?: string[] }[];
}

export const STARTER_SPACES: StarterSpace[] = [
  { key: 'work', name: 'Work', color: 'sky', icon: 'briefcase', fields: [{ name: 'Client', type: 'text' }] },
  {
    key: 'home',
    name: 'Home',
    color: 'sage',
    icon: 'home',
    fields: [{ name: 'Room', type: 'select', options: ['Kitchen', 'Living room', 'Bedroom', 'Bathroom', 'Garden'] }],
  },
  { key: 'errands', name: 'Errands', color: 'sand', icon: 'cart' },
  { key: 'side', name: 'Side project', color: 'lavender', icon: 'rocket' },
  { key: 'study', name: 'Study', color: 'teal', icon: 'book' },
  { key: 'health', name: 'Health', color: 'blush', icon: 'heart' },
];

/** Defaults every install should have (not sample data: real, editable lists). */
export async function ensureDefaults(): Promise<void> {
  await repos.transaction(async () => {
    if (await repos.meta.get(DEFAULTS)) return;
    await repos.meta.set(DEFAULTS, true);
    // Someone with existing data (e.g. from an import) keeps their own list.
    if ((await repos.breakIdeas.list()).length === 0) {
      for (const [i, text] of DEFAULT_BREAK_IDEAS.entries()) await repos.breakIdeas.create({ text, order: i });
    }
  });
}

export async function isOnboarded(): Promise<boolean> {
  if (await repos.meta.get(ONBOARDED)) return true;
  // Anyone who already has spaces has effectively set up the app.
  return (await repos.spaces.list()).length > 0;
}

/** Finish the guide: create chosen spaces (skipping names that exist) and an optional first task. */
export async function completeOnboarding(opts: {
  spaceKeys: string[];
  customSpace?: string;
  firstTask?: string;
}): Promise<void> {
  await repos.transaction(async () => {
    const existing = await repos.spaces.list();
    const names = new Set(existing.map((s) => s.name.toLowerCase()));
    let order = existing.length;
    const created: string[] = [];

    const chosen = STARTER_SPACES.filter((s) => opts.spaceKeys.includes(s.key));
    for (const s of chosen) {
      if (names.has(s.name.toLowerCase())) continue;
      const space = await repos.spaces.create({
        name: s.name,
        color: s.color,
        icon: s.icon,
        order: order++,
        fields: (s.fields ?? []).map((f) => ({ id: f.name.toLowerCase(), ...f })),
      });
      created.push(space.id);
    }
    const custom = opts.customSpace?.trim();
    if (custom && !names.has(custom.toLowerCase())) {
      const space = await repos.spaces.create({ name: custom, color: 'apricot', icon: 'sparkles', order: order++, fields: [] });
      created.push(space.id);
    }
    // Always leave the user with at least one space.
    if (existing.length === 0 && created.length === 0) {
      const space = await repos.spaces.create({ name: 'Personal', color: 'sage', icon: 'leaf', order: 0, fields: [] });
      created.push(space.id);
    }

    const title = opts.firstTask?.trim();
    const spaceId = created[0] ?? existing[0]?.id;
    if (title && spaceId) {
      await repos.tasks.create({ ...repos.blankTask(spaceId), title, plannedFor: todayISO() });
    }
    await repos.meta.set(ONBOARDED, true);
  });
}
