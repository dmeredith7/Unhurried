import { ChevronLeft, ChevronRight, Heart, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntryEditor } from '../components/EntryEditor';
import { Button, IconButton, PageHeader, Sheet } from '../components/ui';
import { useBlocks, useScheduleData, useSettings, useSpaceMap } from '../data/hooks';
import type { ScheduleKind, Space, WorkBlock } from '../data/types';
import {
  SLOTS_PER_DAY,
  layoutLanes,
  placeBlocks,
  resolveWeek,
  slotLabel,
  summarizeWeek,
  weekDates,
  weekStartFor,
  type PlacedBlock,
  type ResolvedEntry,
} from '../domain/schedule';
import { addDays, parseISODate, todayISO } from '../lib/dates';
import { spaceHex } from '../lib/spaceStyle';
import { QUALITY_LABELS } from './FocusScreen';

const SLOT_H = 22; // px per 30 minutes

function fmtHours(min: number): string {
  if (min === 0) return '0 h';
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

export function ScheduleScreen() {
  const settings = useSettings();
  const data = useScheduleData();
  const blocks = useBlocks() ?? [];
  const spaceMap = useSpaceMap();
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(() => weekStartFor(today, settings.weekStartsOn));
  const [day, setDay] = useState(today); // selected day on phones
  const [editing, setEditing] = useState<ResolvedEntry | null>(null);
  const [adding, setAdding] = useState<{ date: string; startSlot: number; kind?: ScheduleKind } | null>(null);
  const [viewing, setViewing] = useState<WorkBlock | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Follow the week-start setting once it loads or changes.
  useEffect(() => {
    // Re-anchor on the middle of the shown week so it stays the same week.
    setWeekStart((ws) => weekStartFor(addDays(ws, 3), settings.weekStartsOn));
  }, [settings.weekStartsOn]);

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  useEffect(() => {
    if (!dates.includes(day)) setDay(dates.includes(today) ? today : dates[0]);
  }, [dates, day, today]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * 2 * SLOT_H;
  }, []);

  const entries = useMemo(
    () => (data ? resolveWeek(data.template, data.overrides, weekStart) : []),
    [data, weekStart],
  );
  const placed = useMemo(() => placeBlocks(blocks, weekStart), [blocks, weekStart]);
  const summary = summarizeWeek(entries, placed);
  const hasLeisure = entries.some((e) => e.kind === 'leisure');
  const isThisWeek = dates.includes(today);

  const rangeLabel = `${parseISODate(dates[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${parseISODate(
    dates[6],
  ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <div>
      <PageHeader
        title="Unschedule"
        subtitle="Play first. Real work fills in as you do it."
        actions={
          <Button variant="primary" onClick={() => setAdding({ date: dates.includes(today) ? today : dates[0], startSlot: 36 })}>
            <Plus className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">Add time</span>
            <span className="sr-only sm:hidden">Add time</span>
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-1">
        <IconButton label="Previous week" onClick={() => setWeekStart((w) => addDays(w, -7))}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </IconButton>
        <h2 className="min-w-36 text-center font-medium" aria-live="polite">
          {rangeLabel}
        </h2>
        <IconButton label="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </IconButton>
        {!isThisWeek && (
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(weekStartFor(today, settings.weekStartsOn))}>
            This week
          </Button>
        )}
      </div>

      {data && !hasLeisure && (
        <section className="mb-5 flex flex-col gap-3 rounded-3xl bg-leisure-soft p-5 sm:flex-row sm:items-center">
          <Heart className="size-6 shrink-0 text-leisure" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium">Start with play</p>
            <p className="text-sm text-muted">
              Before any work, add the things that recharge you: exercise, friends, hobbies, rest. Then add committed
              time like sleep and meals. Whatever is left is open for work.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setAdding({ date: dates.includes(today) ? today : dates[0], startSlot: 36, kind: 'leisure' })}
          >
            Add leisure time
          </Button>
        </section>
      )}

      <WeekSummaryCard summary={summary} spaceMap={spaceMap} isThisWeek={isThisWeek} isFuture={dates[0] > today} />

      <Legend />

      {/* Day picker for phones */}
      <div className="mb-2 grid grid-cols-7 gap-1 md:hidden" role="group" aria-label="Choose a day">
        {dates.map((d) => {
          const dt = parseISODate(d);
          const on = d === day;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => setDay(d)}
              className={`flex flex-col items-center rounded-xl py-1.5 text-xs ${
                on ? 'bg-ink text-bg' : d === today ? 'bg-accent-soft' : 'bg-surface'
              }`}
            >
              <span>{dt.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
              <span className="text-sm font-medium">{dt.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        className="relative max-h-[65dvh] overflow-y-auto rounded-2xl border border-line bg-surface"
      >
        <div className="sticky top-0 z-20 hidden grid-cols-[3.5rem_repeat(7,1fr)] border-b border-line bg-surface md:grid">
          <div />
          {dates.map((d) => {
            const dt = parseISODate(d);
            return (
              <div key={d} className={`py-2 text-center text-sm ${d === today ? 'font-semibold text-accent' : 'text-muted'}`}>
                {dt.toLocaleDateString(undefined, { weekday: 'short' })} {dt.getDate()}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[3.5rem_1fr] md:grid-cols-[3.5rem_repeat(7,1fr)]">
          <div className="relative" style={{ height: SLOTS_PER_DAY * SLOT_H }} aria-hidden="true">
            {Array.from({ length: 24 }, (_, h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-muted"
                style={{ top: h * 2 * SLOT_H }}
              >
                {h === 0 ? '' : slotLabel(h * 2).replace(':00', '')}
              </span>
            ))}
          </div>
          {dates.map((d) => (
            <DayColumn
              key={d}
              date={d}
              hiddenOnPhone={d !== day}
              isToday={d === today}
              entries={entries.filter((e) => e.date === d)}
              placed={placed.filter((p) => p.date === d)}
              spaceMap={spaceMap}
              onAdd={(startSlot) => setAdding({ date: d, startSlot })}
              onEdit={setEditing}
              onViewBlock={setViewing}
            />
          ))}
        </div>
      </div>

      <EntryEditor
        open={!!editing || !!adding}
        entry={editing}
        defaults={adding}
        dates={dates}
        onClose={() => {
          setEditing(null);
          setAdding(null);
        }}
      />

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title="Focus block">
        {viewing && (
          <div className="space-y-2 pb-4">
            <p className="text-lg font-medium">{viewing.label || 'Free block'}</p>
            <p className="text-muted">
              {new Date(viewing.startedAt).toLocaleString(undefined, {
                weekday: 'long',
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              · {viewing.actualMinutes} minutes
            </p>
            <p>
              Quality: {viewing.quality} ({QUALITY_LABELS[viewing.quality - 1]})
            </p>
            {viewing.note && <p className="rounded-xl bg-surface-2 p-3">{viewing.note}</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function DayColumn({
  date,
  hiddenOnPhone,
  isToday,
  entries,
  placed,
  spaceMap,
  onAdd,
  onEdit,
  onViewBlock,
}: {
  date: string;
  hiddenOnPhone: boolean;
  isToday: boolean;
  entries: ResolvedEntry[];
  placed: PlacedBlock[];
  spaceMap: Map<string, Space>;
  onAdd: (slot: number) => void;
  onEdit: (e: ResolvedEntry) => void;
  onViewBlock: (b: WorkBlock) => void;
}) {
  const lanes = layoutLanes(entries.map((e) => ({ ...e, start: e.startSlot, end: e.endSlot })));
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dayName = parseISODate(date).toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div
      className={`relative border-l border-line ${hiddenOnPhone ? 'hidden md:block' : ''} ${isToday ? 'bg-accent-soft/30' : ''}`}
      style={{
        height: SLOTS_PER_DAY * SLOT_H,
        backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${2 * SLOT_H}px)`,
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const slot = Math.floor(e.nativeEvent.offsetY / SLOT_H);
        onAdd(Math.max(0, Math.min(SLOTS_PER_DAY - 1, slot)));
      }}
      aria-label={`${dayName} schedule`}
      role="group"
    >
      {lanes.map((e) => (
        <button
          key={e.key}
          type="button"
          onClick={() => onEdit(e)}
          className={`absolute overflow-hidden rounded-lg px-1.5 py-0.5 text-left text-[11px] leading-tight sm:text-xs ${
            e.kind === 'leisure'
              ? 'border-l-[3px] border-leisure bg-leisure-soft font-medium text-ink'
              : e.kind === 'committed'
                ? 'bg-surface-2 text-muted'
                : 'border border-dashed border-accent/60 text-muted'
          }`}
          style={{
            top: e.startSlot * SLOT_H + 1,
            height: (e.endSlot - e.startSlot) * SLOT_H - 2,
            left: `calc(${(e.lane / e.lanes) * 100}% + 2px)`,
            width: `calc(${100 / e.lanes}% - 4px)`,
          }}
          aria-label={`${e.label}, ${kindName(e.kind)}, ${slotLabel(e.startSlot)} to ${slotLabel(e.endSlot)}`}
        >
          {e.label}
          {e.endSlot - e.startSlot >= 2 && (
            <span className="block font-normal opacity-80">
              {slotLabel(e.startSlot)}–{slotLabel(e.endSlot)}
            </span>
          )}
        </button>
      ))}

      {placed.map((p) => {
        const color = spaceHex(p.block.spaceId ? spaceMap.get(p.block.spaceId)?.color : 'slate');
        return (
          <button
            key={p.block.id}
            type="button"
            onClick={() => onViewBlock(p.block)}
            className="absolute right-1 z-10 overflow-hidden rounded-md px-1.5 text-left text-[11px] leading-tight font-medium shadow-sm sm:text-xs"
            style={{
              top: (p.startMin / 30) * SLOT_H,
              height: Math.max(14, ((p.endMin - p.startMin) / 30) * SLOT_H - 1),
              left: '30%',
              backgroundColor: color,
              color: '#17201b',
            }}
            aria-label={`Focus block: ${p.block.label || 'Free block'}, ${p.block.actualMinutes} minutes`}
          >
            {p.block.label || 'Focus'}
          </button>
        );
      })}

      {isToday && (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-accent"
          style={{ top: (nowMin / 30) * SLOT_H }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function kindName(k: ScheduleKind): string {
  return k === 'leisure' ? 'leisure' : k === 'committed' ? 'committed time' : 'planned work';
}

function Legend() {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm border-l-[3px] border-leisure bg-leisure-soft" /> Leisure
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm bg-surface-2 ring-1 ring-line" /> Committed
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm border border-dashed border-accent/60" /> Planned work
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm bg-[#7AA7C7]" /> Focus done
      </li>
    </ul>
  );
}

function WeekSummaryCard({
  summary,
  spaceMap,
  isThisWeek,
  isFuture,
}: {
  summary: ReturnType<typeof summarizeWeek>;
  spaceMap: Map<string, Space>;
  isThisWeek: boolean;
  isFuture: boolean;
}) {
  const max = Math.max(1, ...summary.bySpace.map((s) => s.minutes));
  return (
    <section className="mb-5 rounded-3xl bg-surface p-5 shadow-[0_1px_0_var(--line)]" aria-labelledby="week-summary">
      <h2 id="week-summary" className="sr-only">
        Week summary
      </h2>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat value={fmtHours(summary.focusMinutes)} label="quality work" />
        <Stat value={String(summary.blockCount)} label={summary.blockCount === 1 ? 'block' : 'blocks'} />
        <Stat value={fmtHours(summary.leisureMinutes)} label="leisure protected" accent />
      </div>
      <p className="mt-4 text-[15px]">
        {summary.blockCount === 0
          ? isThisWeek
            ? 'A fresh week. Any block you do will show up here.'
            : isFuture
              ? "This week hasn't started yet. Plan your leisure first."
              : 'No focus blocks logged this week. Rest counts too.'
          : summary.focusMinutes >= 60
            ? `You put in ${fmtHours(summary.focusMinutes)} of focused work${isThisWeek ? ' so far' : ''}. That's something to feel good about.`
            : `${summary.blockCount === 1 ? 'One block' : `${summary.blockCount} blocks`} of real focus. Every start counts.`}
      </p>
      {summary.bySpace.length > 0 && (
        <ul className="mt-4 space-y-2">
          {summary.bySpace.map((s) => {
            const space = s.spaceId ? spaceMap.get(s.spaceId) : undefined;
            return (
              <li key={s.spaceId ?? 'none'} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2 text-sm">
                <span className="truncate">{space?.name ?? 'Free blocks'}</span>
                <span className="h-2 rounded-full bg-surface-2">
                  <span
                    className="block h-2 rounded-full"
                    style={{ width: `${(s.minutes / max) * 100}%`, backgroundColor: spaceHex(space?.color ?? 'slate') }}
                  />
                </span>
                <span className="text-right text-muted tabular-nums">{fmtHours(s.minutes)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-3 ${accent ? 'bg-leisure-soft' : 'bg-surface-2'}`}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
