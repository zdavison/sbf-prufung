import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, recordAnswer, weakQuestions, resetProgress, STORAGE_KEY } from './progress';

beforeEach(() => localStorage.clear());

describe('progress', () => {
  it('loadProgress returns {} for empty storage', () => {
    expect(loadProgress()).toEqual({});
  });

  it('recordAnswer increments correct/wrong and updates lastSeen', () => {
    recordAnswer('q1', true);
    recordAnswer('q1', true);
    recordAnswer('q1', false);
    const p = loadProgress();
    expect(p['q1']!.correct).toBe(2);
    expect(p['q1']!.wrong).toBe(1);
    expect(p['q1']!.lastSeen).toBeGreaterThan(0);
  });

  it('weakQuestions returns ids with wrong > correct, worst first', () => {
    recordAnswer('q1', false); recordAnswer('q1', false); recordAnswer('q1', true);
    recordAnswer('q2', false); recordAnswer('q2', true);   // tie; not weak
    recordAnswer('q3', false); recordAnswer('q3', false); recordAnswer('q3', false);
    const weak = weakQuestions();
    expect(weak).toEqual(['q3', 'q1']);
  });

  it('resetProgress clears storage', () => {
    recordAnswer('q1', true);
    resetProgress();
    expect(loadProgress()).toEqual({});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('survives a corrupt storage payload', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadProgress()).toEqual({});
  });
});
