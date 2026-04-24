import type { Progress } from './types';

export const STORAGE_KEY = 'sbf.progress.v1';

export function loadProgress(): Progress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Progress;
  } catch {
    return {};
  }
}

function save(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function recordAnswer(id: string, correct: boolean): void {
  const p = loadProgress();
  const entry = p[id] ?? { correct: 0, wrong: 0, lastSeen: 0 };
  if (correct) entry.correct += 1; else entry.wrong += 1;
  entry.lastSeen = Date.now();
  p[id] = entry;
  save(p);
}

export function weakQuestions(): string[] {
  const p = loadProgress();
  return Object.entries(p)
    .filter(([, v]) => v.wrong > v.correct)
    .sort((a, b) => (b[1].wrong - b[1].correct) - (a[1].wrong - a[1].correct))
    .map(([id]) => id);
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
