import { describe, it, expect, vi } from 'vitest';
import type { Question } from './types';

vi.mock('../../data/questions.json', () => ({
  default: [
    { id: 'basis-1', exam: 'basis', category: 'A', officialNumber: 1, correctIndex: 0,
      de: { question: 'dq1', answers: ['d1','d2','d3','d4'] },
      en: { question: 'eq1', answers: ['e1','e2','e3','e4'] } },
    { id: 'binnen-73', exam: 'binnen', category: 'B', officialNumber: 73, correctIndex: 0,
      de: { question: 'dq2', answers: ['d1','d2','d3','d4'] },
      en: { question: 'eq2', answers: ['e1','e2','e3','e4'] } },
    { id: 'see-73', exam: 'see', category: 'C', officialNumber: 73, correctIndex: 0,
      de: { question: 'dq3', answers: ['d1','d2','d3','d4'] },
      en: { question: 'eq3', answers: ['e1','e2','e3','e4'] } },
  ] satisfies Question[],
}));

import { byExam, byCategory, getQuestion, allCategories } from './data';

describe('data helpers', () => {
  it('byExam("binnen") returns basis + binnen questions, in officialNumber order', () => {
    const qs = byExam('binnen');
    expect(qs.map(q => q.id)).toEqual(['basis-1', 'binnen-73']);
  });
  it('byExam("see") returns basis + see questions', () => {
    const qs = byExam('see');
    expect(qs.map(q => q.id)).toEqual(['basis-1', 'see-73']);
  });
  it('byCategory groups questions', () => {
    const map = byCategory('binnen');
    expect([...map.keys()]).toEqual(['A', 'B']);
    expect(map.get('A')!.map(q => q.id)).toEqual(['basis-1']);
  });
  it('getQuestion looks up by id', () => {
    expect(getQuestion('basis-1')?.de.question).toBe('dq1');
    expect(getQuestion('missing')).toBeUndefined();
  });
  it('allCategories returns deduped list for an exam', () => {
    expect(allCategories('binnen')).toEqual(['A', 'B']);
  });
});
