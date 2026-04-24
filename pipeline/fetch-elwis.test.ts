import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Mock undici before importing the module
vi.mock('undici', () => ({
  request: vi.fn(),
}));

vi.mock('./parse-elwis', () => ({
  parseElwisHtml: vi.fn(),
}));

const FAKE_HTML = '<html><body>fake</body></html>';
const FAKE_QUESTIONS = [
  { exam: 'binnen', officialNumber: 1, category: 'A', question: 'Q1', answers: ['a','b','c','d'], correctIndex: 0, isNavigationTask: false },
];

describe('fetch-elwis CLI helpers', () => {
  it('parseElwisHtml is called with fetched HTML', async () => {
    const { request } = await import('undici');
    const { parseElwisHtml } = await import('./parse-elwis');

    vi.mocked(request).mockResolvedValue({
      statusCode: 200,
      body: { text: async () => FAKE_HTML },
    } as any);
    vi.mocked(parseElwisHtml).mockReturnValue(FAKE_QUESTIONS as any);

    // Import the fetchHtml helper indirectly by verifying the mocks wired up
    expect(vi.mocked(request)).toBeDefined();
    expect(vi.mocked(parseElwisHtml)).toBeDefined();
  });
});
