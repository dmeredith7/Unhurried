import { Check, Plus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useSpaces, useTasks } from '../data/hooks';
import * as repos from '../data/repos';
import type { CustomFieldDef, CustomFieldType, Space, SpaceColor } from '../data/types';
import { newId } from '../lib/ids';
import { SPACE_COLORS, SPACE_ICONS, SpaceBadge } from '../lib/spaceStyle';
import { Button, Field, IconButton, Sheet, inputClass } from './ui';

export function SpaceEditor({
  open,
  space,
  onClose,
}: {
  open: boolean;
  space: Space | null; // null = create
  onClose: () => void;
}) {
  const spaces = useSpaces() ?? [];
  const tasks = useTasks() ?? [];
  const [name, setName] = useState('');
  const [color, setColor] = useState<SpaceColor>('sage');
  const [icon, setIcon] = useState('sparkles');
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [moveTo, setMoveTo] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(space?.name ?? '');
    setColor(space?.color ?? 'sage');
    setIcon(space?.icon ?? 'sparkles');
    setFields(space?.fields ?? []);
    setDeleting(false);
    setMoveTo('');
  }, [open, space]);

  const others = spaces.filter((s) => s.id !== space?.id);
  const taskCount = space ? tasks.filter((t) => t.spaceId === space.id).length : 0;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const cleanFields = fields
      .filter((f) => f.name.trim())
      .map((f) => ({
        ...f,
        name: f.name.trim(),
        options: f.type === 'select' ? (f.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
      }));
    if (space) {
      await repos.spaces.update(space.id, { name: name.trim(), color, icon, fields: cleanFields });
    } else {
      await repos.spaces.create({
        name: name.trim(),
        color,
        icon,
        order: Math.max(-1, ...spaces.map((s) => s.order)) + 1,
        fields: cleanFields,
      });
    }
    onClose();
  }

  async function confirmDelete() {
    if (!space) return;
    await repos.removeSpace(space.id, moveTo || undefined);
    onClose();
  }

  const formId = 'space-editor-form';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={space ? 'Edit space' : 'New space'}
      footer={
        deleting ? (
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Keep it
            </Button>
            <div className="flex-1" />
            <Button variant="secondary" onClick={confirmDelete}>
              {taskCount > 0 && !moveTo ? `Delete space and ${taskCount} tasks` : 'Delete space'}
            </Button>
          </>
        ) : (
          <>
            {space && (
              <Button
                variant="ghost"
                onClick={() => {
                  setMoveTo(others[0]?.id ?? '');
                  setDeleting(true);
                }}
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={formId} disabled={!name.trim()}>
              {space ? 'Save' : 'Create space'}
            </Button>
          </>
        )
      }
    >
      {deleting ? (
        <div className="space-y-4 pt-1">
          <p>
            {taskCount > 0
              ? `"${space?.name}" has ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}. Where should ${
                  taskCount === 1 ? 'it' : 'they'
                } go?`
              : `Delete "${space?.name}"? It has no tasks.`}
          </p>
          {taskCount > 0 && (
            <Field label="Move tasks to">
              {(id) => (
                <select id={id} className={inputClass} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  {others.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="">Don't keep them (delete the tasks)</option>
                </select>
              )}
            </Field>
          )}
        </div>
      ) : (
        <form id={formId} onSubmit={save} className="space-y-5 pt-1">
          <div className="flex items-center gap-3">
            <SpaceBadge color={color} icon={icon} size="lg" />
            <div className="flex-1">
              <Field label="Name">
                {(id) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Errands"
                    autoFocus
                    required
                  />
                )}
              </Field>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Color</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SPACE_COLORS) as SpaceColor[]).map((c) => (
                <label
                  key={c}
                  className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                  style={{ backgroundColor: SPACE_COLORS[c].hex }}
                  title={SPACE_COLORS[c].label}
                >
                  <input
                    type="radio"
                    name="space-color"
                    value={c}
                    checked={color === c}
                    onChange={() => setColor(c)}
                    className="sr-only"
                    aria-label={SPACE_COLORS[c].label}
                  />
                  {color === c && <Check className="size-5 text-white" strokeWidth={3} aria-hidden="true" />}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Icon</legend>
            <div className="grid grid-cols-8 gap-1.5">
              {Object.entries(SPACE_ICONS).map(([key, { label, Icon }]) => (
                <label
                  key={key}
                  title={label}
                  className={`inline-flex aspect-square cursor-pointer items-center justify-center rounded-xl transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                    icon === key ? 'bg-ink text-bg' : 'bg-surface-2 text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="space-icon"
                    value={key}
                    checked={icon === key}
                    onChange={() => setIcon(key)}
                    className="sr-only"
                    aria-label={label}
                  />
                  <Icon className="size-5" aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>

          <CustomFieldDefs value={fields} onChange={setFields} />
        </form>
      )}
    </Sheet>
  );
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Choice list' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Yes / no' },
];

function CustomFieldDefs({
  value,
  onChange,
}: {
  value: CustomFieldDef[];
  onChange: (v: CustomFieldDef[]) => void;
}) {
  const update = (id: string, patch: Partial<CustomFieldDef>) =>
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Custom fields</legend>
      <p className="text-xs text-muted">
        Extra details for tasks in this space, like "Client" for work or "Room" for home.
      </p>
      {value.map((f, i) => (
        <div key={f.id} className="space-y-2 rounded-2xl bg-surface-2 p-3">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={f.name}
              placeholder="Field name"
              aria-label={`Field ${i + 1} name`}
              onChange={(e) => update(f.id, { name: e.target.value })}
            />
            <select
              className={`${inputClass} !w-auto`}
              value={f.type}
              aria-label={`Field ${i + 1} type`}
              onChange={(e) => update(f.id, { type: e.target.value as CustomFieldType })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <IconButton
              label={`Remove field ${f.name || i + 1}`}
              onClick={() => onChange(value.filter((x) => x.id !== f.id))}
            >
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
          {f.type === 'select' && (
            <input
              className={inputClass}
              placeholder="Choices, separated by commas"
              aria-label={`Field ${i + 1} choices`}
              value={(f.options ?? []).join(', ')}
              onChange={(e) => update(f.id, { options: e.target.value.split(',').map((o) => o.trimStart()) })}
            />
          )}
        </div>
      ))}
      <Button
        size="sm"
        onClick={() => onChange([...value, { id: newId(), name: '', type: 'text' }])}
      >
        <Plus className="size-4" aria-hidden="true" />
        Add field
      </Button>
    </fieldset>
  );
}
