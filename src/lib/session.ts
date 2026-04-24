import type { Exam, Mode } from './types';

// Persisted mid-run state so a page refresh resumes where the user left off.
// Stores question IDs only (not whole Question objects) — the queue is rehydrated
// via data.getQuestion at load time. Cleared by clearSession() when a run ends.
export const SESSION_KEY = 'sbf.session.v1';

export type Session = {
  mode: Mode;
  exam: Exam;
  category?: string;
  queueIds: string[];
  index: number;
  answers: Record<string, boolean>;
};

export function saveSession(s: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // quota exceeded or privacy-mode storage — silently drop, nothing to do
  }
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (
      !s ||
      typeof s !== 'object' ||
      !Array.isArray(s.queueIds) ||
      typeof s.index !== 'number' ||
      typeof s.mode !== 'string' ||
      typeof s.exam !== 'string' ||
      typeof s.answers !== 'object' ||
      s.answers === null
    ) return null;
    return s as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
