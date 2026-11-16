import { GripVertical, Plus, Sparkles, X } from 'lucide-react';
import { useId, useState } from 'react';
import type { CustomFieldDef, CustomValue, Recurrence, RecurrenceFreq, Subtask } from '../data/types';
import { describeRecurrence } from '../domain/recurrence';
import { reframeForTitle } from '../domain/reframes';
import { newId } from '../lib/ids';
import { parseISODate } from '../lib/dates';
import { Button, Field, IconButton, inputClass } from './ui';

// ---- Subtasks -----------------------------------------------------------

export function SubtaskList({
  value,
  onChange,
  showDone = true,
}: {
  value: Subtask[];
  onChange: (v: Subtask[]) => void;
  showDone?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const done = value.filter((s) => s.done).length;

  function add() {
    const title = draft.trim();
    if (!title) return;
    onChange([...value, { id: newId(), title, done: false }]);
    setDraft('');
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-medium">
          Steps
        </label>
        {showDone && value.length > 0 && (
          <span className="text-xs text-muted">
            {done} of {value.length} done
          </span>
        )}
      </div>
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-2 py-1">
              <GripVertical className="size-4 shrink-0 text-muted/50" aria-hidden="true" />
              {showDone && (
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={(e) =>
                    onChange(value.map((x) => (x.id === s.id ? { ...x, done: e.target.checked } : x)))
                  }
                  aria-label={`Step done: ${s.title}`}
                  className="size-4.5 shrink-0 accent-[var(--accent)]"
                />
              )}
              <input
                className={`min-w-0 flex-1 bg-transparent py-1.5 text-[15px] focus:outline-none ${
                  s.done ? 'text-muted line-through' : ''
                }`}
                value={s.title}
                aria-label={`Step ${i + 1}`}
                onChange={(e) =>
                  onChange(value.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))
                }
              />
              <IconButton
                label={`Remove step: ${s.title}`}
                className="size-8"
                onClick={() => onChange(value.filter((x) => x.id !== s.id))}
              >
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          className={inputClass}
          placeholder={value.length ? 'Add another step' : 'Break it into a small first step'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button onClick={add} disabled={!draft.trim()} aria-label="Add step">
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// ---- Recurrence ---------------------------------------------------------

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function RecurrenceField({
  value,
  onChange,
  dueDate,
  weekStartsOn,
}: {
  value: Recurrence | null;
  onChange: (v: Recurrence | null) => void;
  dueDate?: string | null;
  weekStartsOn: 0 | 1;
}) {
  const freqId = useId();
  const intervalId = useId();
  const unit = value ? { daily: 'day', weekly: 'week', monthly: 'month' }[value.freq] : '';
  const order = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

  function setFreq(f: string) {
    if (!f) return onChange(null);
    const freq = f as RecurrenceFreq;
    const base = dueDate ? parseISODate(dueDate) : new Date();
    onChange({
      freq,
      interval: value?.interval ?? 1,
      from: value?.from ?? 'due',
      weekdays: freq === 'weekly' ? [base.getDay()] : undefined,
      dayOfMonth: freq === 'monthly' ? base.getDate() : undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor={freqId} className="block text-sm font-medium">
            Repeats
          </label>
          <select id={freqId} className={inputClass} value={value?.freq ?? ''} onChange={(e) => setFreq(e.target.value)}>
            <option value="">Doesn't repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {value && (
          <div className="space-y-1.5">
            <label htmlFor={intervalId} className="block text-sm font-medium">
              Every
            </label>
            <div className="flex items-center gap-2">
              <input
                id={intervalId}
                type="number"
                min={1}
                max={99}
                className={`${inputClass} w-20`}
                value={value.interval}
                onChange={(e) =>
                  onChange({ ...value, interval: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })
                }
              />
              <span className="text-sm text-muted">
                {unit}
                {value.interval === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        )}
      </div>

      {value?.freq === 'weekly' && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">On</legend>
          <div className="flex gap-1.5">
            {order.map((d) => {
              const on = value.weekdays?.includes(d) ?? false;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_NAMES[d]}
                  onClick={() => {
                    const cur = new Set(value.weekdays ?? []);
                    if (on) cur.delete(d);
                    else cur.add(d);
                    onChange({ ...value, weekdays: cur.size ? [...cur] : undefined });
                  }}
                  className={`size-10 rounded-full text-sm font-medium transition-colors ${
                    on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-ink'
                  }`}
                >
                  {WEEKDAYS[d]}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {value && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Next one is scheduled</legend>
          <div className="flex flex-col gap-1.5 text-[15px] sm:flex-row sm:gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={value.from === 'due'}
                onChange={() => onChange({ ...value, from: 'due' })}
                className="accent-[var(--accent)]"
              />
              On a regular rhythm
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={value.from === 'completion'}
                onChange={() => onChange({ ...value, from: 'completion' })}
                className="accent-[var(--accent)]"
              />
              Counting from when I finish
            </label>
          </div>
          <p className="mt-1.5 text-xs text-muted">{describeRecurrence(value)}. Missed ones never pile up.</p>
        </fieldset>
      )}
    </div>
  );
}

// ---- Custom fields ------------------------------------------------------

export function CustomFieldInputs({
  defs,
  values,
  onChange,
}: {
  defs: CustomFieldDef[];
  values: Record<string, CustomValue>;
  onChange: (v: Record<string, CustomValue>) => void;
}) {
  if (defs.length === 0) return null;
  const set = (id: string, v: CustomValue | null) => {
    const next = { ...values };
    if (v === null || v === '') delete next[id];
    else next[id] = v;
    onChange(next);
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {defs.map((f) =>
        f.type === 'checkbox' ? (
          <label key={f.id} className="flex items-center gap-3 self-end rounded-xl bg-surface-2 px-3 py-3">
            <input
              type="checkbox"
              checked={values[f.id] === true}
              onChange={(e) => set(f.id, e.target.checked ? true : null)}
              className="size-5 accent-[var(--accent)]"
            />
            {f.name}
          </label>
        ) : (
          <Field key={f.id} label={f.name}>
            {(id) =>
              f.type === 'select' ? (
                <select
                  id={id}
                  className={inputClass}
                  value={String(values[f.id] ?? '')}
                  onChange={(e) => set(f.id, e.target.value)}
                >
                  <option value="">None</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  className={inputClass}
                  value={String(values[f.id] ?? '')}
                  onChange={(e) =>
                    set(f.id, f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)
                  }
                />
              )
            }
          </Field>
        ),
      )}
    </div>
  );
}

/** Format a custom value for compact display. */
export function formatCustomValue(def: CustomFieldDef, v: CustomValue | undefined): string | null {
  if (v === undefined || v === '' || v === false) return null;
  if (def.type === 'checkbox') return def.name;
  if (def.type === 'date' && typeof v === 'string') {
    return `${def.name}: ${parseISODate(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  return `${def.name}: ${v}`;
}

// ---- Reframe hint -------------------------------------------------------

export function ReframeHint({
  title,
  estimate,
  onRewrite,
}: {
  title: string;
  estimate: number;
  onRewrite: (t: string) => void;
}) {
  const r = reframeForTitle(title, estimate);
  if (!r) return null;
  const rewritten = r.rewrite?.(title);
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-leisure-soft px-4 py-3 text-sm" role="note">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-leisure" aria-hidden="true" />
      <div className="flex-1">
        <p>
          A gentler way to see it: {r.from} becomes {r.to}
        </p>
        {rewritten && rewritten !== title && (
          <button
            type="button"
            onClick={() => onRewrite(rewritten)}
            className="mt-1 font-medium text-leisure underline underline-offset-2"
          >
            Use "{rewritten}"
          </button>
        )}
      </div>
    </div>
  );
}
