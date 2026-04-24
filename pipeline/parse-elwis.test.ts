import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { parseElwisHtml } from './parse-elwis';

let binnenHtml: string = '';
let seeHtml: string = '';
let fixturesAvailable = false;

beforeAll(() => {
  const binnenPath = 'pipeline/__fixtures__/elwis-binnen.html';
  const seePath = 'pipeline/__fixtures__/elwis-see.html';
  if (existsSync(binnenPath) && existsSync(seePath)) {
    binnenHtml = readFileSync(binnenPath, 'utf8');
    seeHtml = readFileSync(seePath, 'utf8');
    fixturesAvailable = true;
  }
});

describe('parseElwisHtml', () => {
  it.skipIf(() => !fixturesAvailable)('returns 300 questions for Binnen', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    expect(qs).toHaveLength(300);
  });

  it.skipIf(() => !fixturesAvailable)('returns 300 questions for See', () => {
    const qs = parseElwisHtml(seeHtml, 'see');
    expect(qs).toHaveLength(300);
  });

  it.skipIf(() => !fixturesAvailable)('assigns officialNumber 1..300 in order', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    expect(qs.map(q => q.officialNumber)).toEqual(Array.from({ length: 300 }, (_, i) => i + 1));
  });

  it.skipIf(() => !fixturesAvailable)('every question has exactly 4 answers', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    for (const q of qs) expect(q.answers).toHaveLength(4);
  });

  it.skipIf(() => !fixturesAvailable)('correctIndex is 0 for every question (first answer is correct per ELWIS convention)', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    for (const q of qs) expect(q.correctIndex).toBe(0);
  });

  it.skipIf(() => !fixturesAvailable)('flags navigation tasks for See 286-300', () => {
    const qs = parseElwisHtml(seeHtml, 'see');
    for (const q of qs) {
      const expected = q.officialNumber >= 286 && q.officialNumber <= 300;
      expect(q.isNavigationTask).toBe(expected);
    }
  });

  it.skipIf(() => !fixturesAvailable)('extracts image URLs when present', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    const withImages = qs.filter(q => q.imageRef);
    expect(withImages.length).toBeGreaterThan(0);
    for (const q of withImages) {
      expect(q.imageRef).toMatch(/^https?:\/\//);
    }
  });
});
