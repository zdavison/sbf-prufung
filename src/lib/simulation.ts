import type { Exam, Question } from './types';
import { byExam } from './data';
import { shuffle } from './shuffle';

export const SIM_SIZE = 30;
export const SIM_BASIS_COUNT = 7;
export const SIM_SPECIFIC_COUNT = SIM_SIZE - SIM_BASIS_COUNT;

export function buildSimulation(exam: Exam): Question[] {
  const all = byExam(exam);
  const basis = all.filter(q => q.exam === 'basis');
  const specific = all.filter(q => q.exam === exam);
  return shuffle([
    ...shuffle(basis).slice(0, SIM_BASIS_COUNT),
    ...shuffle(specific).slice(0, SIM_SPECIFIC_COUNT),
  ]);
}
