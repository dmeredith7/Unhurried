/**
 * Small, accessible chart pieces for the Progress dashboard. Plain HTML so
 * tooltips, keyboard focus and table views come for free.
 *
 * Specs: bars at most 24px wide with a 4px rounded data end and a square
 * baseline; hairline solid gridlines; text in text colors, never the bar color;
 * every value also reachable in a table view.
 */
import { useId, useState, type ReactNode } from 'react';

export interface ColumnDatum {
  key: string;
  label: string; // axis label, e.g. "Mon"
  value: number;
  /** Full text for the tooltip and table, e.g. "1 h 30 min". */
  valueText: string;
  /** Compact direct label for an emphasized column, e.g. "1.5 h". */
  shortText?: string;
  /** Longer name for the tooltip/table, e.g. "Monday, Nov 16". */
  title: string;
  /** Highlight this column (the one the story is about). */
  emphasis?: boolean;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

/**
 * Vertical columns, one series. With `emphasize`, only emphasized columns use
 * the accent and the rest recede to gray (emphasis form); otherwise all accent.
 */
export function ColumnChart({
  data,
  label,
  unit,
  tickFormat,
  emphasize = false,
  height = 140,
}: {
  data: ColumnDatum[];
  label: string;
  unit: string;
  tickFormat: (v: number) => string;
  emphasize?: boolean;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];

  return (
    <figure className="m-0">
      <div className="flex gap-2" role="group" aria-label={label}>
        {/* Y axis ticks */}
        <div className="relative w-8 shrink-0" style={{ height }} aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[11px] text-muted tabular-nums"
              style={{ top: height - (t / max) * height }}
            >
              {tickFormat(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute inset-x-0 h-px"
                style={{ top: height - (t / max) * height, background: t === 0 ? 'var(--line)' : 'var(--chart-grid)' }}
                aria-hidden="true"
              />
            ))}
            <div className="absolute inset-0 flex items-end">
              {data.map((d, i) => {
                const h = d.value > 0 ? Math.max(3, (d.value / max) * height) : 0;
                const color = !emphasize || d.emphasis ? 'var(--accent)' : 'var(--chart-context)';
                const isActive = active === i;
                return (
                  <div
                    key={d.key}
                    className="relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                    tabIndex={0}
                    role="img"
                    aria-label={`${d.title}: ${d.valueText}`}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  >
                    {/* Direct label only on the emphasized column. */}
                    {d.emphasis && d.value > 0 && !isActive && (
                      <span
                        className="absolute text-xs font-medium whitespace-nowrap text-ink"
                        style={{ bottom: h + 4 }}
                        aria-hidden="true"
                      >
                        {d.shortText ?? d.valueText}
                      </span>
                    )}
                    <div
                      className={`w-full max-w-6 rounded-t transition-opacity ${isActive ? 'opacity-80' : ''}`}
                      style={{ height: h, background: color, marginInline: 2 }}
                    />
                    {isActive && (
                      <div
                        className="pointer-events-none absolute z-10 rounded-lg bg-ink px-2.5 py-1.5 text-center whitespace-nowrap text-bg shadow-lg"
                        style={{ bottom: h + 8 }}
                        aria-hidden="true"
                      >
                        <span className="block text-sm font-semibold">{d.valueText}</span>
                        <span className="block text-[11px] opacity-80">{d.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-1.5 flex" aria-hidden="true">
            {data.map((d) => (
              <span
                key={d.key}
                className={`flex-1 truncate text-center text-[11px] ${d.emphasis ? 'font-semibold text-ink' : 'text-muted'}`}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <TableView
        caption={label}
        head={['', unit]}
        rows={data.map((d) => [d.title, d.valueText])}
      />
    </figure>
  );
}

export interface BarDatum {
  key: string;
  name: ReactNode;
  plainName: string;
  value: number;
  valueText: string;
}

/** Ranked horizontal bars, one hue, value printed at the end of each row. */
export function BarList({ data, label, unit }: { data: BarDatum[]; label: string; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="m-0">
      <ul className="space-y-3" aria-label={label}>
        {data.map((d) => (
          <li key={d.key} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="min-w-0 truncate">{d.name}</span>
            <span className="h-2.5 rounded-r bg-transparent" aria-hidden="true">
              <span
                className="block h-2.5 rounded-r"
                style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: 'var(--accent)' }}
              />
            </span>
            <span className="text-right text-muted tabular-nums">{d.valueText}</span>
          </li>
        ))}
      </ul>
      <TableView caption={label} head={['', unit]} rows={data.map((d) => [d.plainName, d.valueText])} />
    </figure>
  );
}

/** A ratio against its whole: same-hue track, accent fill. */
export function Meter({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div
      className="h-2 rounded-full bg-accent-soft"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(1, ratio) * 100}%` }} />
    </div>
  );
}

/** The table-view twin every chart carries. */
export function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  const id = useId();
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted hover:text-ink" aria-controls={id}>
        Show as table
      </summary>
      <table id={id} className="mt-2 w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className={`py-1.5 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="py-1.5 font-normal">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="py-1.5 text-right tabular-nums">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
