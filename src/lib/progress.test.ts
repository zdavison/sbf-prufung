import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadProgress, recordAnswer, weakQuestions, resetProgress, STORAGE_KEY,
  lastWrongKey, getLastWrong, appendLastWrong, resetLastWrong, LAST_WRONG_KEY,
} from './progress';

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

describe('lastWrong', () => {
  it('lastWrongKey composes exam and category', () => {
    expect(lastWrongKey('binnen', 'Schallsignale')).toBe('binnen::Schallsignale');
  });

  it('getLastWrong returns [] for an unknown key', () => {
    expect(getLastWrong(lastWrongKey('binnen', 'X'))).toEqual([]);
  });

  it('appendLastWrong stores ids for a key and preserves insertion order', () => {
    const k = lastWrongKey('binnen', 'A');
    appendLastWrong(k, 'q1');
    appendLastWrong(k, 'q2');
    appendLastWrong(k, 'q3');
    expect(getLastWrong(k)).toEqual(['q1', 'q2', 'q3']);
  });

  it('appendLastWrong deduplicates within a key', () => {
    const k = lastWrongKey('binnen', 'A');
    appendLastWrong(k, 'q1');
    appendLastWrong(k, 'q1');
    expect(getLastWrong(k)).toEqual(['q1']);
  });

  it('appendLastWrong isolates entries per key', () => {
    appendLastWrong(lastWrongKey('binnen', 'A'), 'q1');
    appendLastWrong(lastWrongKey('binnen', 'B'), 'q2');
    expect(getLastWrong(lastWrongKey('binnen', 'A'))).toEqual(['q1']);
    expect(getLastWrong(lastWrongKey('binnen', 'B'))).toEqual(['q2']);
  });

  it('resetLastWrong clears only the targeted key', () => {
    appendLastWrong(lastWrongKey('binnen', 'A'), 'q1');
    appendLastWrong(lastWrongKey('binnen', 'B'), 'q2');
    resetLastWrong(lastWrongKey('binnen', 'A'));
    expect(getLastWrong(lastWrongKey('binnen', 'A'))).toEqual([]);
    expect(getLastWrong(lastWrongKey('binnen', 'B'))).toEqual(['q2']);
  });

  it('survives a corrupt lastWrong payload', () => {
    localStorage.setItem(LAST_WRONG_KEY, '{not json');
    expect(getLastWrong(lastWrongKey('binnen', 'A'))).toEqual([]);
  });
});
