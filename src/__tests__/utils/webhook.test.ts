import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWebhook, type WebhookPayload } from '@/utils/webhook';

const VALID_URL = 'https://example.com/webhook';

const makePayload = (overrides?: Partial<WebhookPayload>): WebhookPayload => ({
  sessionId: 'test-session-123',
  status: 'completed',
  timestamp: 1700000000000,
  ...overrides,
});

describe('sendWebhook', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('sends a POST request with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const payload = makePayload();
    await sendWebhook(VALID_URL, payload);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(VALID_URL);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBe(JSON.stringify(payload));
  });

  it('includes AbortSignal timeout', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await sendWebhook(VALID_URL, makePayload());

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options.signal).toBeDefined();
  });

  it('retries once on failure then succeeds', async () => {
    fetchSpy
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await sendWebhook(VALID_URL, makePayload());

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('retries on non-ok HTTP status', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await sendWebhook(VALID_URL, makePayload());

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not throw when all retries fail', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    // Should not throw
    await expect(sendWebhook(VALID_URL, makePayload())).resolves.toBeUndefined();
  });

  it('logs a warning when webhook delivery fails', async () => {
    fetchSpy.mockRejectedValue(new Error('Connection refused'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sendWebhook(VALID_URL, makePayload());

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('Webhook delivery failed');
    expect(warnSpy.mock.calls[0][0]).toContain(VALID_URL);

    warnSpy.mockRestore();
  });

  it('does not throw on non-ok status after all retries exhausted', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 502 }));

    await expect(sendWebhook(VALID_URL, makePayload())).resolves.toBeUndefined();
  });
});
