import raw from '../../data/questions.json';
import type { Question, Exam } from './types';

const all = raw as Question[];
const byId = new Map(all.map(q => [q.id, q]));

export function byExam(exam: Exam): Question[] {
  return all.filter(q => q.exam === 'basis' || q.exam === exam)
            .sort((a, b) => a.officialNumber - b.officialNumber);
}

export function byCategory(exam: Exam): Map<string, Question[]> {
  const map = new Map<string, Question[]>();
  for (const q of byExam(exam)) {
    const list = map.get(q.category) ?? [];
    list.push(q);
    map.set(q.category, list);
  }
  return map;
}

export function allCategories(exam: Exam): string[] {
  return [...byCategory(exam).keys()];
}

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}

export function allQuestions(): Question[] {
  return all;
}

// Graceful degradation: true only if the dataset contains exam-specific questions
// for this exam (basis questions alone don't count — the Home picker uses this
// to hide exams whose catalog hasn't landed yet).
export function hasExam(exam: Exam): boolean {
  return all.some(q => q.exam === exam);
}
