import { describe, it, expect, vi } from 'vitest';
import type { Question } from './types';
import { buildSimulation, SIM_BASIS_COUNT, SIM_SPECIFIC_COUNT } from './simulation';

const fakeQuestions: Question[] = [
  ...Array.from({ length: SIM_BASIS_COUNT + 5 }, (_, i) => makeQ('basis', i + 1)),
  ...Array.from({ length: SIM_SPECIFIC_COUNT + 5 }, (_, i) => makeQ('binnen', i + 73)),
  ...Array.from({ length: SIM_SPECIFIC_COUNT + 5 }, (_, i) => makeQ('see', i + 73)),
];
function makeQ(exam: 'basis' | 'binnen' | 'see', n: number): Question {
  return {
    id: `${exam}-${n}`, exam, category: 'X', officialNumber: n, correctIndex: 0,
    de: { question: 'd', answers: ['a', 'b', 'c', 'd'] },
    en: { question: 'e', answers: ['a', 'b', 'c', 'd'] },
  };
}

vi.mock('./data', () => ({
  byExam: (exam: 'binnen' | 'see') =>
    fakeQuestions.filter(q => q.exam === 'basis' || q.exam === exam),
}));

describe('buildSimulation', () => {
  it('returns 30 questions for binnen with 7 basis + 23 binnen', () => {
    const q = buildSimulation('binnen');
    expect(q).toHaveLength(30);
    expect(q.filter(x => x.exam === 'basis')).toHaveLength(7);
    expect(q.filter(x => x.exam === 'binnen')).toHaveLength(23);
  });
  it('returns 30 questions for see with 7 basis + 23 see', () => {
    const q = buildSimulation('see');
    expect(q).toHaveLength(30);
    expect(q.filter(x => x.exam === 'basis')).toHaveLength(7);
    expect(q.filter(x => x.exam === 'see')).toHaveLength(23);
  });
  it('ids are unique within a simulation', () => {
    const q = buildSimulation('binnen');
    expect(new Set(q.map(x => x.id)).size).toBe(30);
  });
});
