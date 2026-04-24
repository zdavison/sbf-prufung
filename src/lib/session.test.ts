import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession, clearSession, SESSION_KEY, type Session } from './session';

beforeEach(() => localStorage.clear());

const sample: Session = {
  mode: 'sequential',
  exam: 'binnen',
  category: 'Allgemeines',
  queueIds: ['basis-1', 'basis-2', 'basis-3'],
  index: 1,
  answers: { 'basis-1': true },
};

describe('session', () => {
  it('loadSession returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull();
  });

  it('saveSession + loadSession round-trips', () => {
    saveSession(sample);
    expect(loadSession()).toEqual(sample);
  });

  it('clearSession removes the entry', () => {
    saveSession(sample);
    clearSession();
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('loadSession returns null on corrupt payload', () => {
    localStorage.setItem(SESSION_KEY, '{not json');
    expect(loadSession()).toBeNull();
  });

  it('loadSession returns null when shape is wrong', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ queueIds: 'not an array' }));
    expect(loadSession()).toBeNull();
  });
});
