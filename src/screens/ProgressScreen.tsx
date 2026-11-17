import { ChevronLeft, ChevronRight, CircleCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BarList, ColumnChart, Meter } from '../components/charts';
import { Button, IconButton, PageHeader } from '../components/ui';
import { useBlocks, useGoals, useScheduleData, useSettings, useSpaceMap, useTasks } from '../data/hooks';
import { goalProgress } from '../domain/reverse';
import { resolveWeek, summarizeWeek, placeBlocks, weekStartFor } from '../domain/schedule';
import {
  averageQuality,
  bestTimeOfDay,
  blocksInWeek,
  completedInWeek,
  focusByDay,
  focusByWeek,
  formatDuration,
  qualityCounts,
  shortHours,
  weekdayShort,
} from '../domain/stats';
import { addDays, parseISODate, todayISO } from '../lib/dates';
import { SpaceBadge } from '../lib/spaceStyle';
import { QUALITY_LABELS } from './FocusScreen';

const PART_TEXT = { morning: 'in the morning', afternoon: 'in the afternoon', evening: 'in the evening' };

function fmtDate(d: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return parseISODate(d).toLocaleDateString(undefined, opts);
}

export function ProgressScreen() {
  const settings = useSettings();
  const blocks = useBlocks();
  const tasks = useTasks() ?? [];
  const goals = useGoals() ?? [];
  const schedule = useScheduleData();
  const spaceMap = useSpaceMap();
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(() => weekStartFor(today, settings.weekStartsOn));

  useEffect(() => {
    setWeekStart((ws) => weekStartFor(addDays(ws, 3), settings.weekStartsOn));
  }, [settings.weekStartsOn]);

  const thisWeekStart = weekStartFor(today, settings.weekStartsOn);
  const isThisWeek = weekStart === thisWeekStart;
  const isFuture = weekStart > thisWeekStart;

  const all = useMemo(() => blocks ?? [], [blocks]);
  const week = useMemo(() => blocksInWeek(all, weekStart), [all, weekStart]);
  const focusMinutes = week.reduce((n, b) => n + b.actualMinutes, 0);
  const avgQ = averageQuality(week);
  const done = completedInWeek(tasks, weekStart);
  const entries = schedule ? resolveWeek(schedule.template, schedule.overrides, weekStart) : [];
  const summary = summarizeWeek(entries, placeBlocks(all, weekStart));
  const days = focusByDay(all, weekStart);
  const weeks = focusByWeek(all, weekStart, 8);
  const quality = qualityCounts(week);
  const best = bestTimeOfDay(all);
  const activeGoals = goals.filter((g) => g.status === 'active');

  const rangeLabel = `${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6))}`;

  if (blocks && all.length === 0 && done.tasks.length === 0 && done.steps.length === 0) {
    return (
      <>
        <PageHeader title="Progress" subtitle="Celebrating what you did, never what you didn't." />
        <div className="rounded-3xl bg-surface p-8 text-center shadow-[0_1px_0_var(--line)]">
          <p className="text-lg font-medium">Your progress will show up here</p>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            Finish a focus block or tick off a task and this page will start to fill in. One block is a great start.
          </p>
          <Link
            to="/focus"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent px-4 font-medium text-accent-ink hover:opacity-90"
          >
            Start a block
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Progress" subtitle="Celebrating what you did, never what you didn't." />

      {/* One filter row; everything below follows the chosen week. */}
      <div className="mb-5 flex items-center gap-1">
        <IconButton label="Previous week" onClick={() => setWeekStart((w) => addDays(w, -7))}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </IconButton>
        <h2 className="min-w-36 text-center font-medium" aria-live="polite">
          {isThisWeek ? 'This week' : rangeLabel}
        </h2>
        <IconButton label="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </IconButton>
        {!isThisWeek && (
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(thisWeekStart)}>
            This week
          </Button>
        )}
      </div>

      {/* Hero */}
      <section className="mb-4 rounded-3xl bg-accent-soft p-6" aria-labelledby="hero-label">
        <p id="hero-label" className="text-sm font-medium text-muted">
          Focused work {isThisWeek ? 'this week' : `· ${rangeLabel}`}
        </p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">{formatDuration(focusMinutes)}</p>
        <p className="mt-2 text-[15px]">{heroLine(focusMinutes, week.length, isThisWeek, isFuture)}</p>
      </section>

      {/* KPI row */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="This week in numbers">
        <Stat label="Focus blocks" value={String(week.length)} />
        <Stat
          label="Average focus"
          value={avgQ === null ? '–' : `${avgQ.toFixed(1)}`}
          sub={avgQ === null ? 'No ratings yet' : `of 5 · ${QUALITY_LABELS[Math.round(avgQ) - 1].toLowerCase()}`}
        />
        <Stat label="Leisure protected" value={formatDuration(summary.leisureMinutes)} warm />
        <Stat label="Tasks finished" value={String(done.tasks.length)} />
        <Stat label="Goal steps reached" value={String(done.steps.length)} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Focus by day" subtitle={isThisWeek ? 'Today is highlighted' : undefined}>
          <ColumnChart
            label="Focus minutes by day"
            unit="Focus"
            emphasize={isThisWeek}
            tickFormat={(v) => (v >= 60 ? `${shortHours(v)}h` : `${Math.round(v)}m`)}
            data={days.map((d) => ({
              key: d.date,
              label: weekdayShort(d.date),
              value: d.minutes,
              valueText: d.minutes ? formatDuration(d.minutes) : 'None',
              shortText: d.minutes >= 60 ? `${shortHours(d.minutes)} h` : `${d.minutes} min`,
              title: `${fmtDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}${
                d.blocks ? ` · ${d.blocks} ${d.blocks === 1 ? 'block' : 'blocks'}` : ''
              }`,
              emphasis: isThisWeek && d.date === today,
            }))}
          />
        </Card>

        <Card title="The last 8 weeks" subtitle="Hours of focused work, chosen week highlighted">
          <ColumnChart
            label="Focus hours by week"
            unit="Focus"
            emphasize
            tickFormat={(v) => `${shortHours(v)}h`}
            data={weeks.map((w) => ({
              key: w.weekStart,
              label: fmtDate(w.weekStart, { month: 'numeric', day: 'numeric' }),
              value: w.minutes,
              valueText: w.minutes ? formatDuration(w.minutes) : 'None',
              shortText: `${shortHours(w.minutes)} h`,
              title: `Week of ${fmtDate(w.weekStart, { month: 'long', day: 'numeric' })}`,
              emphasis: w.weekStart === weekStart,
            }))}
          />
        </Card>

        <Card title="Where your focus went">
          {summary.bySpace.length === 0 ? (
            <p className="text-sm text-muted">No focus blocks this week yet.</p>
          ) : (
            <BarList
              label="Focus by space"
              unit="Focus"
              data={summary.bySpace.map((s) => {
                const space = s.spaceId ? spaceMap.get(s.spaceId) : undefined;
                const name = space?.name ?? 'Free blocks';
                return {
                  key: s.spaceId ?? 'none',
                  plainName: name,
                  name: (
                    <span className="inline-flex items-center gap-2">
                      <SpaceBadge color={space?.color ?? 'slate'} icon={space?.icon ?? 'sparkles'} size="sm" />
                      {name}
                    </span>
                  ),
                  value: s.minutes,
                  valueText: formatDuration(s.minutes),
                };
              })}
            />
          )}
        </Card>

        <Card title="How your blocks felt" subtitle="Your own quality ratings">
          {week.length === 0 ? (
            <p className="text-sm text-muted">Rated blocks will appear here.</p>
          ) : (
            <ColumnChart
              label="Number of blocks by focus rating"
              unit="Blocks"
              height={110}
              tickFormat={(v) => (Number.isInteger(v) ? String(v) : '')}
              data={quality.map((count, i) => ({
                key: String(i + 1),
                label: `${i + 1}`,
                value: count,
                valueText: `${count} ${count === 1 ? 'block' : 'blocks'}`,
                title: `${i + 1} · ${QUALITY_LABELS[i]}`,
              }))}
            />
          )}
          {best && (
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-leisure-soft px-4 py-3 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-leisure" aria-hidden="true" />
              Your focus tends to be best {PART_TEXT[best.part]}. Worth protecting that time when you can.
            </p>
          )}
        </Card>
      </div>

      {activeGoals.length > 0 && (
        <Card title="Goals" className="mt-4">
          <ul className="space-y-4">
            {activeGoals.map((g) => {
              const gt = tasks.filter((t) => t.goalId === g.id);
              const p = goalProgress(gt.map((t) => ({ kind: t.kind, id: t.id, parentId: t.parentId, done: t.status === 'done' })));
              return (
                <li key={g.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <Link to={`/goals/${g.id}`} className="truncate font-medium hover:underline">
                      {g.title}
                    </Link>
                    <span className="shrink-0 text-muted">
                      {p.done} of {p.total} · by {fmtDate(g.deadline)}
                    </span>
                  </div>
                  <Meter ratio={p.ratio} label={`${g.title}: ${Math.round(p.ratio * 100)}% done`} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {done.tasks.length + done.steps.length > 0 && (
        <Card title="Finished this week" subtitle="Every one of these counts" className="mt-4">
          <ul className="space-y-1.5">
            {[...done.tasks, ...done.steps]
              .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
              .slice(0, 12)
              .map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-[15px]">
                  <CircleCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="truncate">{t.title}</span>
                  {t.kind !== 'task' && <span className="shrink-0 text-xs text-muted">goal step</span>}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function heroLine(minutes: number, blocks: number, isThisWeek: boolean, isFuture: boolean): string {
  if (isFuture) return "This week hasn't started yet.";
  if (blocks === 0) return isThisWeek ? 'A fresh week. Your first block will show up here.' : 'A quieter week. Rest counts too.';
  if (minutes >= 300) return `${blocks} blocks of real focus. That's a strong week. Enjoy your time off.`;
  if (minutes >= 90) return `${blocks} blocks of real focus. Steady progress, one start at a time.`;
  return `${blocks === 1 ? 'One block' : `${blocks} blocks`} of real focus. Every start counts.`;
}

function Stat({ label, value, sub, warm }: { label: string; value: string; sub?: string; warm?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${warm ? 'bg-leisure-soft' : 'bg-surface shadow-[0_1px_0_var(--line)]'}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl bg-surface p-5 shadow-[0_1px_0_var(--line)] ${className}`}>
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
