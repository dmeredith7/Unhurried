import { ArrowDown, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGoalPlan } from '../data/goals';
import { useSpaces } from '../data/hooks';
import { suggestDates } from '../domain/reverse';
import { addDays, parseISODate, todayISO } from '../lib/dates';
import { newId } from '../lib/ids';
import { Button, Field, IconButton, Sheet, inputClass } from './ui';

interface Draft {
  id: string;
  title: string;
  date: string | null; // null = use the suggested date
}

function fmt(d: string) {
  return parseISODate(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Create a goal by working backward: start at the deadline, then ask
 * "what needs to happen just before that?" until reaching a step for today.
 */
export function GoalWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const spaces = useSpaces() ?? [];
  const navigate = useNavigate();
  const today = todayISO();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState(addDays(today, 56));
  const [spaceId, setSpaceId] = useState('');
  // Entered backward: index 0 is the final milestone (at the deadline).
  const [backward, setBackward] = useState<Draft[]>([]);
  const [next, setNext] = useState('');
  const [firstStep, setFirstStep] = useState('');
  const [doToday, setDoToday] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setTitle('');
    setDeadline(addDays(today, 56));
    setBackward([]);
    setNext('');
    setFirstStep('');
    setDoToday(true);
    setBusy(false);
  }, [open, today]);

  const firstSpace = spaces[0]?.id ?? '';
  useEffect(() => {
    if (open && !spaceId && firstSpace) setSpaceId(firstSpace);
  }, [open, spaceId, firstSpace]);

  // Chronological order with suggested dates (user overrides kept).
  const chronological = useMemo(() => {
    const items = [...backward].reverse();
    const suggested = suggestDates(today, deadline, items.length);
    return items.map((m, i) => ({ ...m, date: m.date ?? suggested[i] }));
  }, [backward, deadline, today]);

  function addEarlier() {
    const t = next.trim();
    if (!t) return;
    setBackward((b) => [...b, { id: newId(), title: t, date: null }]);
    setNext('');
  }

  function goToMilestones() {
    if (backward.length === 0) setBackward([{ id: newId(), title: `${title.trim()}: done`, date: null }]);
    setStep(1);
  }

  async function create() {
    setBusy(true);
    const goal = await createGoalPlan({
      title: title.trim(),
      notes: '',
      deadline,
      spaceId,
      milestones: chronological.map((m) => ({ title: m.title.trim(), date: m.date })),
      firstStep: firstStep.trim() ? { title: firstStep, today: doToday } : null,
    });
    onClose();
    navigate(`/goals/${goal.id}`);
  }

  const earliest = chronological[0];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={['A new goal', 'Work backward', 'Your first small step'][step]}
      footer={
        <>
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === 0 && (
            <Button variant="primary" onClick={goToMilestones} disabled={!title.trim() || !spaceId || deadline <= today}>
              Next
            </Button>
          )}
          {step === 1 && (
            <Button variant="primary" onClick={() => setStep(2)} disabled={chronological.length === 0}>
              Next
            </Button>
          )}
          {step === 2 && (
            <Button variant="primary" onClick={create} disabled={busy}>
              Create plan
            </Button>
          )}
        </>
      }
    >
      {step === 0 && (
        <div className="space-y-4 pt-1">
          <Field label="What would you like to achieve?">
            {(id) => (
              <input
                id={id}
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Finish the grant application"
                autoFocus
              />
            )}
          </Field>
          <Field label="By when?" hint="A target, not a threat. You can always adjust it.">
            {(id) => (
              <input
                id={id}
                type="date"
                min={addDays(today, 1)}
                className={inputClass}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
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
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 pt-1">
          <p className="text-[15px] text-muted">
            Start at the finish line and walk back toward today. Each time, ask: what needs to be true just before
            this? Dates are spread out for you; change any of them.
          </p>
          <ol className="space-y-2">
            {[...chronological].reverse().map((m, i) => (
              <li key={m.id}>
                {i > 0 && <ArrowDown className="mx-auto mb-2 size-4 text-muted" aria-hidden="true" />}
                <div className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3">
                  <div className="flex-1 space-y-2">
                    <input
                      className={`${inputClass} bg-surface`}
                      aria-label={`Milestone ${chronological.length - i}`}
                      value={m.title}
                      onChange={(e) =>
                        setBackward((b) => b.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))
                      }
                    />
                    <label className="flex items-center gap-2 text-sm text-muted">
                      Target
                      <input
                        type="date"
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-ink"
                        value={m.date}
                        max={deadline}
                        aria-label={`Target date for ${m.title}`}
                        onChange={(e) =>
                          setBackward((b) =>
                            b.map((x) => (x.id === m.id ? { ...x, date: e.target.value || null } : x)),
                          )
                        }
                      />
                      {i === 0 && <span>(your deadline)</span>}
                    </label>
                  </div>
                  {chronological.length > 1 && (
                    <IconButton
                      label={`Remove ${m.title}`}
                      onClick={() => setBackward((b) => b.filter((x) => x.id !== m.id))}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="space-y-1.5">
            <label htmlFor="earlier" className="block text-sm font-medium">
              And just before "{earliest?.title}", what needs to happen?
            </label>
            <div className="flex gap-2">
              <input
                id="earlier"
                className={inputClass}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEarlier();
                  }
                }}
                placeholder="An earlier milestone"
              />
              <Button onClick={addEarlier} disabled={!next.trim()} aria-label="Add earlier milestone">
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-xs text-muted">Stop when the earliest milestone feels close enough to start on.</p>
          </div>
        </div>
      )}

      {step === 2 && earliest && (
        <div className="space-y-4 pt-1">
          <p className="text-[15px] text-muted">
            Your first milestone is "{earliest.title}", by {fmt(earliest.date)}. What's one small thing you could do
            today to move toward it? Something under 30 minutes is perfect.
          </p>
          <Field label="First small step">
            {(id) => (
              <input
                id={id}
                className={inputClass}
                value={firstStep}
                onChange={(e) => setFirstStep(e.target.value)}
                placeholder="e.g. Open a blank document and write the title"
                autoFocus
              />
            )}
          </Field>
          <label className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
            <input
              type="checkbox"
              checked={doToday}
              onChange={(e) => setDoToday(e.target.checked)}
              className="size-5 accent-[var(--accent)]"
            />
            Add it to Today
          </label>
          <p className="text-sm text-muted">You can skip this and add steps later.</p>
        </div>
      )}
    </Sheet>
  );
}
