import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, dueLabel } from './dates';

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('counts days across DST changes', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });
  it('labels near dates kindly', () => {
    expect(dueLabel('2026-11-16', '2026-11-16')).toBe('Today');
    expect(dueLabel('2026-11-17', '2026-11-16')).toBe('Tomorrow');
  });
});
