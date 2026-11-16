import { describe, expect, it } from 'vitest';
import { goalProgress, needsReflow, reflowKeepDeadline, reflowPush, suggestDates } from './reverse';

describe('suggestDates', () => {
  it('spaces milestones evenly, ending on the deadline', () => {
    expect(suggestDates('2026-11-16', '2027-02-14', 3)).toEqual(['2026-12-16', '2027-01-15', '2027-02-14']);
  });

  it('works for a single milestone', () => {
    expect(suggestDates('2026-11-16', '2026-12-01', 1)).toEqual(['2026-12-01']);
  });

  it('never goes past the deadline or backwards when time is short', () => {
    const d = suggestDates('2026-11-16', '2026-11-18', 4);
    expect(d[d.length - 1]).toBe('2026-11-18');
    for (let i = 1; i < d.length; i++) expect(d[i] >= d[i - 1]).toBe(true);
    expect(d.every((x) => x <= '2026-11-18')).toBe(true);
  });

  it('handles month and year boundaries', () => {
    expect(suggestDates('2026-12-30', '2027-01-03', 2)).toEqual(['2027-01-01', '2027-01-03']);
  });
});

const plan = [
  { id: 'a', date: '2026-12-01' },
  { id: 'b', date: '2026-12-15' },
  { id: 'c', date: '2027-01-01' },
];

describe('re-flow', () => {
  it('pushes later milestones and the deadline back by the slip', () => {
    const r = reflowPush(plan, 'a', '2026-12-08', '2027-01-01');
    expect(r.dates).toEqual({ a: '2026-12-08', b: '2026-12-22', c: '2027-01-08' });
    expect(r.deadline).toBe('2027-01-08');
  });

  it('keeps the deadline by spreading the rest evenly', () => {
    const r = reflowKeepDeadline(plan, 'a', '2026-12-11', '2027-01-01')!;
    expect(r.dates).toEqual({ a: '2026-12-11', b: '2026-12-22', c: '2027-01-01' });
    expect(r.deadline).toBe('2027-01-01');
  });

  it('cannot keep the deadline once the slip passes it', () => {
    expect(reflowKeepDeadline(plan, 'b', '2027-01-05', '2027-01-01')).toBeNull();
  });

  it('only asks when a later date is affected', () => {
    expect(needsReflow(plan, 'a', '2026-12-05')).toBe(true);
    expect(needsReflow(plan, 'a', '2026-11-28')).toBe(false); // moved earlier
    expect(needsReflow(plan, 'c', '2027-01-10')).toBe(false); // nothing after it
  });
});

describe('goalProgress', () => {
  it('counts steps, and milestones without steps', () => {
    const p = goalProgress([
      { kind: 'milestone', id: 'm1', done: false },
      { kind: 'step', id: 's1', parentId: 'm1', done: true },
      { kind: 'step', id: 's2', parentId: 'm1', done: false },
      { kind: 'milestone', id: 'm2', done: true },
    ]);
    expect(p).toEqual({ done: 2, total: 3, ratio: 2 / 3 });
  });
});
