import { describe, it, expect } from 'vitest';
import { sha1 } from './hash';

describe('sha1', () => {
  it('is stable and 40 chars', () => {
    expect(sha1('hello')).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    expect(sha1('hello')).toHaveLength(40);
  });
  it('differs on different input', () => {
    expect(sha1('a')).not.toBe(sha1('b'));
  });
});
