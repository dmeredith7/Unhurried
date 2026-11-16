import { useEffect, useState, type FormEvent } from 'react';
import { useSpaces } from '../data/hooks';
import { addEntry, deleteEntry, updateEntry, type Scope } from '../data/schedule';
import type { ScheduleKind } from '../data/types';
import { SLOTS_PER_DAY, slotLabel, type ResolvedEntry } from '../domain/schedule';
import { parseISODate } from '../lib/dates';
import { Button, Field, Segmented, Sheet, inputClass } from './ui';

const SUGGESTIONS: Record<ScheduleKind, string[]> = {
  leisure: ['Exercise', 'Time with friends', 'Family time', 'Hobby', 'Reading for fun', 'Nature walk', 'Rest'],
  committed: ['Sleep', 'Breakfast', 'Lunch', 'Dinner', 'Commute', 'Meeting', 'Class', 'School run'],
  plannedWork: ['Focus block', 'Deep work', 'Admin', 'Writing'],
};

export const KIND_LABELS: Record<ScheduleKind, string> = {
  leisure: 'Leisure',
  committed: 'Committed',
  plannedWork: 'Plan work',
};

export function EntryEditor({
  open,
  entry,
  defaults,
  dates,
  onClose,
}: {
  open: boolean;
  entry: ResolvedEntry | null;
  defaults: { date: string; startSlot: number; kind?: ScheduleKind } | null;
  dates: string[];
  onClose: () => void;
}) {
  const spaces = useSpaces() ?? [];
  const [kind, setKind] = useState<ScheduleKind>('leisure');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState(18);
  const [end, setEnd] = useState(20);
  const [spaceId, setSpaceId] = useState('');
  const [repeat, setRepeat] = useState(true);
  const [scope, setScope] = useState<Scope>('all');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setKind(entry.kind);
      setLabel(entry.label);
      setDate(entry.date);
      setStart(entry.startSlot);
      setEnd(entry.endSlot);
      setSpaceId(entry.spaceId ?? '');
    } else {
      const k = defaults?.kind ?? 'leisure';
      const s = defaults?.startSlot ?? 18;
      setKind(k);
      setLabel('');
      setDate(defaults?.date ?? dates[0]);
      setStart(s);
      setEnd(Math.min(SLOTS_PER_DAY, s + 2));
      setSpaceId('');
      setRepeat(k !== 'plannedWork');
    }
    setScope('all');
    setConfirmDelete(false);
  }, [open, entry, defaults, dates]);

  const isWeekly = !!entry?.templateEntryId && !entry.overrideId;
  const valid = label.trim() && end > start && date;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const values = {
      date,
      startSlot: start,
      endSlot: end,
      kind,
      label: label.trim(),
      spaceId: kind === 'plannedWork' && spaceId ? spaceId : null,
    };
    if (entry) await updateEntry(entry, values, scope);
    else await addEntry(values, repeat);
    onClose();
  }

  async function remove() {
    if (entry) await deleteEntry(entry, scope);
    onClose();
  }

  const slots = Array.from({ length: SLOTS_PER_DAY + 1 }, (_, i) => i);
  const formId = 'entry-editor-form';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? 'Edit time' : 'Add time'}
      footer={
        <>
          {entry &&
            (confirmDelete ? (
              <Button onClick={remove}>Yes, remove{isWeekly ? (scope === 'all' ? ' every week' : ' this week') : ''}</Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                Remove
              </Button>
            ))}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={!valid}>
            Save
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={save} className="space-y-5 pt-1">
        <Segmented<ScheduleKind>
          label="Kind of time"
          value={kind}
          onChange={(k) => {
            setKind(k);
            if (!entry) setRepeat(k !== 'plannedWork');
          }}
          options={[
            { value: 'leisure', label: 'Leisure' },
            { value: 'committed', label: 'Committed' },
            { value: 'plannedWork', label: 'Plan work' },
          ]}
        />
        <p className="-mt-3 text-sm text-muted">
          {kind === 'leisure'
            ? 'Guilt-free time for what recharges you. Plan this first.'
            : kind === 'committed'
              ? 'Time that is already spoken for: sleep, meals, commute, meetings.'
              : "A tentative plan. It's never marked as missed. Real work fills in as you do it."}
        </p>

        <div className="space-y-2">
          <Field label="What is it?">
            {(id) => (
              <input
                id={id}
                className={inputClass}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={SUGGESTIONS[kind][0]}
                required
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-1.5" aria-label="Suggestions" role="group">
            {SUGGESTIONS[kind].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLabel(s)}
                className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Field label="Day">
          {(id) => (
            <select id={id} className={inputClass} value={date} onChange={(e) => setDate(e.target.value)}>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {parseISODate(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            {(id) => (
              <select
                id={id}
                className={inputClass}
                value={start}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setStart(s);
                  if (end <= s) setEnd(Math.min(SLOTS_PER_DAY, s + 2));
                }}
              >
                {slots.slice(0, -1).map((s) => (
                  <option key={s} value={s}>
                    {slotLabel(s)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Until">
            {(id) => (
              <select id={id} className={inputClass} value={end} onChange={(e) => setEnd(Number(e.target.value))}>
                {slots
                  .filter((s) => s > start)
                  .map((s) => (
                    <option key={s} value={s}>
                      {slotLabel(s)}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        </div>

        {kind === 'plannedWork' && spaces.length > 0 && (
          <Field label="Space" hint="Optional">
            {(id) => (
              <select id={id} className={inputClass} value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
                <option value="">Any</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {!entry && (
          <label className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
              className="size-5 accent-[var(--accent)]"
            />
            Repeat every week
          </label>
        )}

        {isWeekly && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Apply changes to</legend>
            <div className="flex flex-col gap-1.5 text-[15px] sm:flex-row sm:gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-[var(--accent)]" />
                Every week
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === 'week'} onChange={() => setScope('week')} className="accent-[var(--accent)]" />
                Only this week
              </label>
            </div>
          </fieldset>
        )}
      </form>
    </Sheet>
  );
}
