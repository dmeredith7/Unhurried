import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useSpaces } from '../data/hooks';
import * as repos from '../data/repos';
import type { Priority, Task } from '../data/types';
import { todayISO } from '../lib/dates';
import { Button, Field, IconButton, Segmented, Sheet, inputClass } from './ui';

export type TaskDraft = Partial<Task>;

function parseTags(s: string): string[] {
  return Array.from(
    new Set(
      s
        .split(',')
        .map((t) => t.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean),
    ),
  );
}

/**
 * Create or edit a task. Pass `task` with an id to edit; pass a partial draft
 * (e.g. a preselected space) without an id to create.
 */
export function TaskEditor({
  open,
  task,
  onClose,
}: {
  open: boolean;
  task: TaskDraft | null;
  onClose: () => void;
}) {
  const spaces = useSpaces() ?? [];
  const editing = !!task?.id;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimate, setEstimate] = useState(1);
  const [priority, setPriority] = useState<Priority>('normal');
  const [tags, setTags] = useState('');
  const [today, setToday] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setNotes(task?.notes ?? '');
    setSpaceId(task?.spaceId ?? spaces[0]?.id ?? '');
    setDueDate(task?.dueDate ?? '');
    setEstimate(task?.estimateBlocks ?? 1);
    setPriority(task?.priority ?? 'normal');
    setTags((task?.tags ?? []).join(', '));
    setToday(task?.plannedFor === todayISO());
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  // If spaces load after opening, default to the first one.
  const firstSpaceId = spaces[0]?.id;
  useEffect(() => {
    if (open && !spaceId && firstSpaceId) setSpaceId(firstSpaceId);
  }, [open, spaceId, firstSpaceId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !spaceId) return;
    const fields = {
      title: title.trim(),
      notes,
      spaceId,
      dueDate: dueDate || null,
      estimateBlocks: estimate,
      priority,
      tags: parseTags(tags),
      plannedFor: today ? todayISO() : task?.plannedFor === todayISO() ? null : (task?.plannedFor ?? null),
    };
    if (editing && task?.id) {
      const spaceChanged = task.spaceId !== spaceId;
      await repos.tasks.update(task.id, spaceChanged ? { ...fields, customValues: {} } : fields);
    } else {
      await repos.tasks.create({ ...repos.blankTask(spaceId), ...task, ...fields });
    }
    onClose();
  }

  async function remove() {
    if (!task?.id) return;
    await repos.tasks.remove(task.id);
    onClose();
  }

  const formId = 'task-editor-form';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit task' : 'New task'}
      footer={
        <>
          {editing &&
            (confirmDelete ? (
              <Button variant="secondary" onClick={remove}>
                Yes, delete
              </Button>
            ) : (
              <IconButton label="Delete task" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-5" aria-hidden="true" />
              </IconButton>
            ))}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={!title.trim() || !spaceId}>
            {editing ? 'Save' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={save} className="space-y-4 pt-1">
        <Field label="What would you like to work on?">
          {(id) => (
            <input
              id={id}
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Draft the first paragraph"
              autoFocus
              required
            />
          )}
        </Field>

        <Field label="Space">
          {(id) => (
            <select id={id} className={inputClass} value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date" hint="Optional">
            {(id) => (
              <input
                id={id}
                type="date"
                className={inputClass}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            )}
          </Field>
          <div className="space-y-1.5">
            <span id="estimate-label" className="block text-sm font-medium">
              Estimated blocks
            </span>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1" role="group" aria-labelledby="estimate-label">
              <IconButton label="Fewer blocks" onClick={() => setEstimate((n) => Math.max(1, n - 1))} className="size-8">
                <Minus className="size-4" aria-hidden="true" />
              </IconButton>
              <output className="flex-1 text-center tabular-nums" aria-live="polite">
                {estimate}
              </output>
              <IconButton label="More blocks" onClick={() => setEstimate((n) => Math.min(40, n + 1))} className="size-8">
                <Plus className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
            <p className="text-xs text-muted">About {estimate * 30} minutes</p>
          </div>
        </div>

        <Segmented
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
          ]}
        />

        <Field label="Tags" hint="Separate with commas">
          {(id) => (
            <input
              id={id}
              className={inputClass}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="writing, email"
            />
          )}
        </Field>

        <Field label="Notes">
          {(id) => (
            <textarea
              id={id}
              className={`${inputClass} min-h-20`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything that helps you start"
            />
          )}
        </Field>

        <label className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
          <input
            type="checkbox"
            checked={today}
            onChange={(e) => setToday(e.target.checked)}
            className="size-5 accent-[var(--accent)]"
          />
          <span>Work on this today</span>
        </label>
      </form>
    </Sheet>
  );
}
