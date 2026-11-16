import { describe, expect, it } from 'vitest';
import type { Recurrence } from '../data/types';
import { describeRecurrence, nextOccurrence, stepAfter } from './recurrence';

const rule = (r: Partial<Recurrence>): Recurrence => ({ freq: 'daily', interval: 1, from: 'due', ...r });

describe('stepAfter', () => {
  it('handles daily intervals', () => {
    expect(stepAfter(rule({ interval: 3 }), '2026-11-16')).toBe('2026-11-19');
  });

  it('handles weekly without weekdays', () => {
    expect(stepAfter(rule({ freq: 'weekly' }), '2026-11-16')).toBe('2026-11-23');
  });

  it('finds the next chosen weekday', () => {
    // 2026-11-16 is a Monday. Mon + Thu → Thursday the 19th.
    expect(stepAfter(rule({ freq: 'weekly', weekdays: [1, 4] }), '2026-11-16')).toBe('2026-11-19');
    // From Thursday → next Monday.
    expect(stepAfter(rule({ freq: 'weekly', weekdays: [1, 4] }), '2026-11-19')).toBe('2026-11-23');
  });

  it('respects every-2-weeks with weekdays', () => {
    const r = rule({ freq: 'weekly', interval: 2, weekdays: [1] });
    expect(stepAfter(r, '2026-11-16')).toBe('2026-11-30');
  });

  it('clamps monthly to short months without drifting', () => {
    const r = rule({ freq: 'monthly', dayOfMonth: 31 });
    expect(stepAfter(r, '2026-01-31')).toBe('2026-02-28');
    expect(stepAfter(r, '2026-02-28')).toBe('2026-03-31');
  });

  it('handles leap years', () => {
    expect(stepAfter(rule({ freq: 'monthly', dayOfMonth: 29 }), '2028-01-29')).toBe('2028-02-29');
  });
});

describe('nextOccurrence', () => {
  it('counts from completion when asked', () => {
    const r = rule({ freq: 'weekly', from: 'completion' });
    expect(nextOccurrence(r, { dueDate: '2026-11-01', completedOn: '2026-11-16' })).toBe('2026-11-23');
  });

  it('keeps the rhythm from the due date', () => {
    const r = rule({ freq: 'weekly' });
    expect(nextOccurrence(r, { dueDate: '2026-11-16', completedOn: '2026-11-15' })).toBe('2026-11-23');
  });

  it('skips missed occurrences instead of piling them up', () => {
    const r = rule({ freq: 'daily' });
    expect(nextOccurrence(r, { dueDate: '2026-11-10', completedOn: '2026-11-16' })).toBe('2026-11-17');
  });

  it('falls back to completion date when there is no due date', () => {
    expect(nextOccurrence(rule({}), { dueDate: null, completedOn: '2026-11-16' })).toBe('2026-11-17');
  });
});

describe('describeRecurrence', () => {
  it('reads naturally', () => {
    expect(describeRecurrence(rule({}))).toBe('Daily');
    expect(describeRecurrence(rule({ freq: 'weekly', interval: 2, weekdays: [4, 1] }))).toBe(
      'Every 2 weeks on Mon, Thu',
    );
  });
});
