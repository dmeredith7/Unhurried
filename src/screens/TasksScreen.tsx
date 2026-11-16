import { LayoutTemplate, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskEditor, draftFromTemplate, type TaskDraft } from '../components/TaskEditor';
import { TaskRow } from '../components/TaskRow';
import { Button, Chip, EmptyState, PageHeader, Sheet, inputClass } from '../components/ui';
import { useSpaceMap, useSpaces, useTasks, useTemplates } from '../data/hooks';
import type { Priority } from '../data/types';
import { spaceHex } from '../lib/spaceStyle';
import { sortTasks } from '../lib/taskSort';

export function TasksScreen() {
  const tasks = useTasks();
  const spaces = useSpaces() ?? [];
  const spaceMap = useSpaceMap();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<TaskDraft | null>(null);
  const [picking, setPicking] = useState(false);
  const templates = useTemplates() ?? [];

  const spaceFilter = params.get('space');
  const tagFilter = params.get('tag');
  const priorityFilter = params.get('priority') as Priority | null;
  const showDone = params.get('done') === '1';
  const query = params.get('q') ?? '';

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const allTags = useMemo(
    () => Array.from(new Set((tasks ?? []).flatMap((t) => t.tags))).sort(),
    [tasks],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortTasks(
      (tasks ?? []).filter(
        (t) =>
          t.kind !== 'milestone' &&
          (showDone || t.status === 'open') &&
          (!spaceFilter || t.spaceId === spaceFilter) &&
          (!tagFilter || t.tags.includes(tagFilter)) &&
          (!priorityFilter || t.priority === priorityFilter) &&
          (!q || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)),
      ),
    );
  }, [tasks, showDone, spaceFilter, tagFilter, priorityFilter, query]);

  const filtered = !!(spaceFilter || tagFilter || priorityFilter || query);

  return (
    <>
      <PageHeader
        title="Tasks"
        actions={
          <>
          {templates.length > 0 && (
            <Button onClick={() => setPicking(true)} disabled={spaces.length === 0}>
              <LayoutTemplate className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">From template</span>
              <span className="sr-only sm:hidden">New task from template</span>
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => setEditing({ spaceId: spaceFilter ?? undefined })}
            disabled={spaces.length === 0}
          >
            <Plus className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">New task</span>
            <span className="sr-only sm:hidden">New task</span>
          </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="task-search"
            type="search"
            className={`${inputClass} pl-9`}
            placeholder="Search"
            value={query}
            onChange={(e) => setParam('q', e.target.value || null)}
          />
        </div>

        <div role="group" aria-label="Filter by space" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <Chip selected={!spaceFilter} onClick={() => setParam('space', null)}>
            All spaces
          </Chip>
          {spaces.map((s) => (
            <Chip
              key={s.id}
              selected={spaceFilter === s.id}
              onClick={() => setParam('space', spaceFilter === s.id ? null : s.id)}
              color={spaceHex(s.color)}
            >
              {s.name}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="tag-filter">
            Filter by tag
          </label>
          <select
            id="tag-filter"
            className={`${inputClass} !w-auto py-2 text-sm`}
            value={tagFilter ?? ''}
            onChange={(e) => setParam('tag', e.target.value || null)}
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="priority-filter">
            Filter by priority
          </label>
          <select
            id="priority-filter"
            className={`${inputClass} !w-auto py-2 text-sm`}
            value={priorityFilter ?? ''}
            onChange={(e) => setParam('priority', e.target.value || null)}
          >
            <option value="">Any priority</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setParam('done', e.target.checked ? '1' : null)}
              className="size-4 accent-[var(--accent)]"
            />
            Show done
          </label>
        </div>
      </div>

      {tasks && visible.length === 0 ? (
        spaces.length === 0 ? (
          <EmptyState title="Create a space to begin">
            Spaces group your tasks, such as Work, Home or Errands. Add one in Settings.
          </EmptyState>
        ) : filtered ? (
          <EmptyState title="Nothing matches these filters" />
        ) : (
          <EmptyState
            title="A clear list"
            action={
              <Button variant="primary" onClick={() => setEditing({})}>
                Add a task
              </Button>
            }
          >
            Add something small you could start on.
          </EmptyState>
        )
      ) : (
        <ul className="space-y-2" aria-label="Tasks">
          {visible.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              space={spaceMap.get(t.spaceId)}
              onOpen={setEditing}
              showSpace={!spaceFilter}
            />
          ))}
        </ul>
      )}

      <TaskEditor open={!!editing} task={editing} onClose={() => setEditing(null)} />

      <Sheet open={picking} onClose={() => setPicking(false)} title="Start from a template">
        <ul className="space-y-2 pb-2">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="w-full rounded-2xl bg-surface-2 px-4 py-3 text-left hover:bg-line"
                onClick={() => {
                  setPicking(false);
                  const draft = draftFromTemplate(t);
                  setEditing({ ...draft, spaceId: draft.spaceId ?? spaceFilter ?? undefined });
                }}
              >
                <span className="block font-medium">{t.name}</span>
                <span className="text-sm text-muted">
                  {[
                    t.subtasks.length ? `${t.subtasks.length} steps` : null,
                    t.spaceId ? spaceMap.get(t.spaceId)?.name : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Blank template'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
