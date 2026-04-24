import '@testing-library/jest-dom/vitest';

// Node 25 exposes a native localStorage that lacks .clear() / .removeItem() etc.
// Patch it with a proper in-memory implementation so progress tests work.
const store: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key: string) => Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  key: (index: number) => Object.keys(store)[index] ?? null,
  get length() { return Object.keys(store).length; },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
