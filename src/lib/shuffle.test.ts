import { describe, it, expect } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('returns a new array with same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic with a seed', () => {
    const a = shuffle([1, 2, 3, 4, 5], 42);
    const b = shuffle([1, 2, 3, 4, 5], 42);
    expect(a).toEqual(b);
  });

  it('varies without a seed', () => {
    const base = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const differs = Array.from({ length: 20 }, () => shuffle([1,2,3,4,5,6,7,8,9,10]))
      .some(r => r.join() !== base.join());
    expect(differs).toBe(true);
  });
});
