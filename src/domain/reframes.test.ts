import { describe, expect, it } from 'vitest';
import { reframeForTitle } from './reframes';

describe('reframeForTitle', () => {
  it('offers "I choose to" and rewrites the wording', () => {
    const r = reframeForTitle('I have to call the bank');
    expect(r?.to).toBe('"I choose to"');
    expect(r?.rewrite?.('I have to call the bank')).toBe('I choose to call the bank');
    expect(r?.rewrite?.('Need to file taxes')).toBe('Choose to file taxes');
  });

  it('suggests starting over finishing', () => {
    expect(reframeForTitle('Finish the report')?.to).toBe('"When can I start?"');
  });

  it('suggests a small step for big tasks', () => {
    expect(reframeForTitle('Write thesis chapter', 6)?.from).toBe('"This is too big"');
  });

  it('stays quiet otherwise', () => {
    expect(reframeForTitle('Water the plants')).toBeNull();
  });
});
