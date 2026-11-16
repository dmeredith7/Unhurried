/**
 * Reactive hooks. `useLiveQuery` re-runs whenever the underlying tables
 * change, so screens stay in sync without manual refreshes.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import * as repos from './repos';
import { DEFAULT_SETTINGS, type Settings, type Space, type Task, type Template } from './types';

export function useSpaces(): Space[] | undefined {
  return useLiveQuery(async () => (await repos.spaces.list()).sort((a, b) => a.order - b.order));
}

export function useTasks(): Task[] | undefined {
  return useLiveQuery(() => repos.tasks.list());
}

export function useSettings(): Settings {
  return useLiveQuery(() => repos.settings.get()) ?? DEFAULT_SETTINGS;
}

export function useSpaceMap(): Map<string, Space> {
  const list = useSpaces();
  return new Map((list ?? []).map((s) => [s.id, s]));
}

export function useTemplates(): Template[] | undefined {
  return useLiveQuery(async () =>
    (await repos.templates.list()).sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export function useBlocks(): import('./types').WorkBlock[] | undefined {
  return useLiveQuery(async () => (await repos.blocks.list()).sort((a, b) => b.startedAt - a.startedAt));
}

export function useBreakIdeas(): import('./types').BreakIdea[] | undefined {
  return useLiveQuery(async () => (await repos.breakIdeas.list()).sort((a, b) => a.order - b.order));
}
