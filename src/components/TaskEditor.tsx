import { BookmarkPlus, Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useSettings, useSpaces } from '../data/hooks';
import * as repos from '../data/repos';
import type { CustomValue, Priority, Recurrence, Subtask, Task, Template } from '../data/types';
import { todayISO } from '../lib/dates';
import { newId } from '../lib/ids';
import { CustomFieldInputs, RecurrenceField, ReframeHint, SubtaskList } from './taskFields';
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

/** Turn a template into a new-task draft with fresh subtask ids. */
export function draftFromTemplate(t: Template): TaskDraft {
  return {
    spaceId: t.spaceId ?? undefined,
    title: t.title,
    notes: t.notes,
    estimateBlocks: t.estimateBlocks,
    priority: t.priority,
    tags: [...t.tags],
    subtasks: t.subtasks.map((title) => ({ id: newId(), title, done: false })),
    recurrence: t.recurrence ?? null,
  };
}

type Props =
  | { mode?: 'task'; open: boolean; task: TaskDraft | null; onClose: () => void }
  | { mode: 'template'; open: boolean; template: Partial<Template> | null; onClose: () => void };

/**
 * Create or edit a task (or, with mode="template", a reusable template).
 * Pass a task with an id to edit; pass a partial draft without an id to create.
 */
export function TaskEditor(props: Props) {
  const isTemplate = props.mode === 'template';
  // Tasks and templates share most fields; read them through one loose view.
  type Source = Omit<Partial<Task>, 'subtasks'> &
    Omit<Partial<Template>, 'subtasks'> & { subtasks?: Subtask[] | string[] };
  const source = (props.mode === 'template' ? props.template : props.task) as Source | null;
  const { open, onClose } = props;

  const spaces = useSpaces() ?? [];
  const settings = useSettings();
  const editing = !!source?.id;

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimate, setEstimate] = useState(1);
  const [priority, setPriority] = useState<Priority>('normal');
  const [tags, setTags] = useState('');
  const [today, setToday] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, CustomValue>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(source?.name ?? '');
    setTitle(source?.title ?? '');
    setNotes(source?.notes ?? '');
    setSpaceId(source?.spaceId ?? '');
    setDueDate(source?.dueDate ?? '');
    setEstimate(source?.estimateBlocks ?? 1);
    setPriority(source?.priority ?? 'normal');
    setTags((source?.tags ?? []).join(', '));
    setToday(source?.plannedFor === todayISO());
    setSubtasks(
      isTemplate
        ? ((source?.subtasks ?? []) as unknown as string[]).map((t) => ({ id: newId(), title: t, done: false }))
        : ((source?.subtasks ?? []) as Subtask[]),
    );
    setRecurrence(source?.recurrence ?? null);
    setCustomValues((source?.customValues as Record<string, CustomValue>) ?? {});
    setConfirmDelete(false);
    setSavedTemplate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  // Tasks need a space; default to the first one once spaces load.
  const firstSpaceId = spaces[0]?.id;
  useEffect(() => {
    if (open && !isTemplate && !spaceId && firstSpaceId) setSpaceId(firstSpaceId);
  }, [open, isTemplate, spaceId, firstSpaceId]);

  const space = spaces.find((s) => s.id === spaceId);
  const canSave = isTemplate ? !!name.trim() : !!title.trim() && !!spaceId;

  function changeSpace(id: string) {
    setSpaceId(id);
    setCustomValues({}); // fields belong to a space
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    const cleanSubtasks = subtasks.filter((s) => s.title.trim()).map((s) => ({ ...s, title: s.title.trim() }));

    if (isTemplate) {
      const fields = {
        name: name.trim(),
        title: title.trim(),
        notes,
        spaceId: spaceId || null,
        estimateBlocks: estimate,
        priority,
        tags: parseTags(tags),
        subtasks: cleanSubtasks.map((s) => s.title),
        recurrence,
      };
      if (editing && source?.id) await repos.templates.update(source.id, fields);
      else await repos.templates.create(fields);
      onClose();
      return;
    }

    const wasToday = source?.plannedFor === todayISO();
    const fields = {
      title: title.trim(),
      notes,
      spaceId,
      dueDate: dueDate || null,
      estimateBlocks: estimate,
      priority,
      tags: parseTags(tags),
      subtasks: cleanSubtasks,
      recurrence,
      customValues,
      plannedFor: today ? todayISO() : wasToday ? null : (source?.plannedFor ?? null),
    };
    if (editing && source?.id) {
      await repos.tasks.update(source.id, fields);
    } else {
      await repos.tasks.create({ ...repos.blankTask(spaceId), ...(source as TaskDraft), ...fields });
    }
    onClose();
  }

  async function saveAsTemplate() {
    await repos.templates.create({
      name: title.trim(),
      title: title.trim(),
      notes,
      spaceId: spaceId || null,
      estimateBlocks: estimate,
      priority,
      tags: parseTags(tags),
      subtasks: subtasks.map((s) => s.title.trim()).filter(Boolean),
      recurrence,
    });
    setSavedTemplate(true);
  }

  async function remove() {
    if (!source?.id) return;
    if (isTemplate) await repos.templates.remove(source.id);
    else await repos.tasks.remove(source.id);
    onClose();
  }

  const formId = isTemplate ? 'template-editor-form' : 'task-editor-form';
  const noun = isTemplate ? 'template' : 'task';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${noun}` : `New ${noun}`}
      footer={
        <>
          {editing &&
            (confirmDelete ? (
              <Button variant="secondary" onClick={remove}>
                Yes, delete
              </Button>
            ) : (
              <IconButton label={`Delete ${noun}`} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-5" aria-hidden="true" />
              </IconButton>
            ))}
          {!isTemplate && editing && !confirmDelete && (
            <IconButton
              label={savedTemplate ? 'Saved as a template' : 'Save as template'}
              onClick={saveAsTemplate}
              disabled={savedTemplate || !title.trim()}
            >
              <BookmarkPlus className={`size-5 ${savedTemplate ? 'text-accent' : ''}`} aria-hidden="true" />
            </IconButton>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={!canSave}>
            {editing ? 'Save' : isTemplate ? 'Create template' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={save} className="space-y-5 pt-1">
        {savedTemplate && (
          <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
            Saved as a template. Find it under "From template" on the Tasks screen.
          </p>
        )}

        {isTemplate && (
          <Field label="Template name">
            {(id) => (
              <input
                id={id}
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekly clean"
                autoFocus
                required
              />
            )}
          </Field>
        )}

        <div className="space-y-2">
          <Field label={isTemplate ? 'Task title' : 'What would you like to work on?'}>
            {(id) => (
              <input
                id={id}
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Draft the first paragraph"
                autoFocus={!isTemplate}
                required={!isTemplate}
              />
            )}
          </Field>
          {settings.reframes && !isTemplate && (
            <ReframeHint title={title} estimate={estimate} onRewrite={setTitle} />
          )}
        </div>

        <Field label="Space">
          {(id) => (
            <select id={id} className={inputClass} value={spaceId} onChange={(e) => changeSpace(e.target.value)}>
              {isTemplate && <option value="">Choose when using it</option>}
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          {!isTemplate && (
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
          )}
          <div className="space-y-1.5">
            <span id={`${formId}-estimate`} className="block text-sm font-medium">
              Estimated blocks
            </span>
            <div
              className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1"
              role="group"
              aria-labelledby={`${formId}-estimate`}
            >
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
            <p className="text-xs text-muted">About {formatMinutes(estimate * settings.blockMinutes)}</p>
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

        {!isTemplate && space && space.fields.length > 0 && (
          <CustomFieldInputs defs={space.fields} values={customValues} onChange={setCustomValues} />
        )}

        <SubtaskList value={subtasks} onChange={setSubtasks} showDone={!isTemplate} />

        <RecurrenceField
          value={recurrence}
          onChange={setRecurrence}
          dueDate={dueDate || null}
          weekStartsOn={settings.weekStartsOn}
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

        {!isTemplate && (
          <label className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
            <input
              type="checkbox"
              checked={today}
              onChange={(e) => setToday(e.target.checked)}
              className="size-5 accent-[var(--accent)]"
            />
            <span>Work on this today</span>
          </label>
        )}
      </form>
    </Sheet>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} ${h === 1 ? 'hour' : 'hours'}`;
}
