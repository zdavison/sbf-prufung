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

// "Redo wrong from last run" — per (exam, category) bucket of question ids missed
// in the most recent sequential-by-category run for that pair. Starting any
// sequential-by-category run for a specific category resets the matching bucket.
export const LAST_WRONG_KEY = 'sbf.lastWrong.v1';

type LastWrong = Record<string, string[]>;

export function lastWrongKey(exam: string, category: string): string {
  return `${exam}::${category}`;
}

function loadLastWrong(): LastWrong {
  const raw = localStorage.getItem(LAST_WRONG_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LastWrong;
  } catch {
    return {};
  }
}

function saveLastWrong(lw: LastWrong): void {
  localStorage.setItem(LAST_WRONG_KEY, JSON.stringify(lw));
}

export function getLastWrong(key: string): string[] {
  return loadLastWrong()[key] ?? [];
}

export function appendLastWrong(key: string, id: string): void {
  const lw = loadLastWrong();
  const list = lw[key] ?? [];
  if (!list.includes(id)) list.push(id);
  lw[key] = list;
  saveLastWrong(lw);
}

export function resetLastWrong(key: string): void {
  const lw = loadLastWrong();
  if (!(key in lw)) return;
  delete lw[key];
  saveLastWrong(lw);
}
