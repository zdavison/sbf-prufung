import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('undici', () => ({
  request: vi.fn(),
}));

describe('fetchHtml', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns response body text on 200', async () => {
    const { request } = await import('undici');
    vi.mocked(request).mockResolvedValue({
      statusCode: 200,
      body: { text: async () => '<html>fake</html>' },
    } as any);

    const { fetchHtml } = await import('./fetch-elwis');
    const result = await fetchHtml('https://example.com/');
    expect(result).toBe('<html>fake</html>');
    expect(vi.mocked(request)).toHaveBeenCalledWith('https://example.com/', expect.objectContaining({
      headers: expect.objectContaining({ 'user-agent': expect.stringContaining('sbf-prufung') }),
    }));
  });

  it('throws on non-200 status', async () => {
    const { request } = await import('undici');
    vi.mocked(request).mockResolvedValue({
      statusCode: 404,
      body: { text: async () => '' },
    } as any);

    const { fetchHtml } = await import('./fetch-elwis');
    await expect(fetchHtml('https://example.com/404')).rejects.toThrow('404');
  });
});
