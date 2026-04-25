import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { parseElwisHtml } from './parse-elwis';

const B = 'pipeline/__fixtures__/elwis-basisfragen.html';
const BI = 'pipeline/__fixtures__/elwis-binnen.html';
const S = 'pipeline/__fixtures__/elwis-segeln.html';
const fixturesAvailable = existsSync(B) && existsSync(BI) && existsSync(S);

const basisHtml = fixturesAvailable ? readFileSync(B, 'utf8') : '';
const binnenHtml = fixturesAvailable ? readFileSync(BI, 'utf8') : '';
const segelnHtml = fixturesAvailable ? readFileSync(S, 'utf8') : '';

describe.skipIf(!fixturesAvailable)('parseElwisHtml', () => {
  it('returns 72 questions numbered 1..72 for the Basisfragen sub-page', () => {
    const qs = parseElwisHtml(basisHtml, 'basis');
    expect(qs).toHaveLength(72);
    expect(qs.map(q => q.officialNumber)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1));
    for (const q of qs) expect(q.exam).toBe('basis');
  });

  it('returns 181 questions numbered 73..253 for the Binnen-specific sub-page', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    expect(qs).toHaveLength(181);
    expect(qs[0]!.officialNumber).toBe(73);
    expect(qs.at(-1)!.officialNumber).toBe(253);
  });

  it('returns 47 questions numbered 254..300 for the Segeln sub-page (tagged as segeln)', () => {
    const qs = parseElwisHtml(segelnHtml, 'segeln');
    expect(qs).toHaveLength(47);
    expect(qs[0]!.officialNumber).toBe(254);
    expect(qs.at(-1)!.officialNumber).toBe(300);
    for (const q of qs) expect(q.exam).toBe('segeln');
  });

  it('every question has exactly 4 answers', () => {
    for (const qs of [
      parseElwisHtml(basisHtml, 'basis'),
      parseElwisHtml(binnenHtml, 'binnen'),
      parseElwisHtml(segelnHtml, 'segeln'),
    ]) {
      for (const q of qs) expect(q.answers).toHaveLength(4);
    }
  });

  it('correctIndex is 0 for every question', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    for (const q of qs) expect(q.correctIndex).toBe(0);
  });

  it('does not set isNavigationTask (fetcher adds that post-parse)', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    for (const q of qs) expect(q.isNavigationTask).toBe(false);
  });

  it('extracts image URLs when present', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    const withImages = qs.filter(q => q.imageRef);
    expect(withImages.length).toBeGreaterThan(0);
    for (const q of withImages) {
      expect(q.imageRef).toMatch(/^https?:\/\//);
    }
  });
});
