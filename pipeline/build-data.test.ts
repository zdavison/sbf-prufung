import { describe, it, expect } from 'vitest';
import { buildQuestions } from './build-data';
import type { RawQuestion } from './types';
import { sha1 } from './hash';

const mkRaw = (exam: 'binnen' | 'see', n: number, q: string, a: string[]): RawQuestion => ({
  exam, officialNumber: n, category: 'Test',
  question: q, answers: a, correctIndex: 0, isNavigationTask: false,
});

describe('buildQuestions', () => {
  it('assigns basis- ids to officialNumber <= 72 and deduplicates across exams', () => {
    const raw = [
      mkRaw('binnen', 1, 'Was ist Backbord?', ['links', 'rechts', 'oben', 'unten']),
      mkRaw('see', 1, 'Was ist Backbord?', ['links', 'rechts', 'oben', 'unten']),
      mkRaw('binnen', 73, 'Binnen-spezifisch', ['a', 'b', 'c', 'd']),
    ];
    const cache = Object.fromEntries(
      ['Was ist Backbord?', 'links', 'rechts', 'oben', 'unten', 'Binnen-spezifisch', 'a', 'b', 'c', 'd']
        .map(s => [sha1(s), { de: s, en: `EN:${s}` }])
    );
    const built = buildQuestions(raw, cache, {});
    const ids = built.map(b => b.id).sort();
    expect(ids).toEqual(['basis-1', 'binnen-73']);
  });

  it('applies overrides by hash', () => {
    const raw = [mkRaw('binnen', 73, 'Hallo', ['a', 'b', 'c', 'd'])];
    const cache = Object.fromEntries(
      ['Hallo', 'a', 'b', 'c', 'd'].map(s => [sha1(s), { de: s, en: `EN:${s}` }])
    );
    const overrides = { [sha1('Hallo')]: 'Hello (override)' };
    const built = buildQuestions(raw, cache, overrides);
    expect(built[0]!.en.question).toBe('Hello (override)');
  });

  it('throws if any string is missing from cache', () => {
    const raw = [mkRaw('binnen', 73, 'Untranslated', ['a', 'b', 'c', 'd'])];
    expect(() => buildQuestions(raw, {}, {})).toThrow(/Untranslated/);
  });
});
