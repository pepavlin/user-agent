import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGoto } = vi.hoisted(() => {
  const mockGoto = vi.fn();
  return { mockGoto };
});

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: mockGoto,
          video: vi.fn().mockReturnValue(null),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { createBrowserManager } from '@/browser/index';

describe('browser navigate', () => {
  beforeEach(() => {
    mockGoto.mockReset();
  });

  it('wraps ERR_NAME_NOT_RESOLVED with user-friendly message', async () => {
    const manager = createBrowserManager();
    await manager.launch();

    mockGoto.mockRejectedValueOnce(
      new Error('page.goto: net::ERR_NAME_NOT_RESOLVED at https://bad.example/\nCall log:\n  - navigating')
    );

    await expect(manager.navigate('https://bad.example')).rejects.toThrow(
      'Could not resolve domain. The URL "https://bad.example" does not exist or DNS lookup failed.'
    );
  });

  it('wraps ERR_CONNECTION_REFUSED with user-friendly message', async () => {
    const manager = createBrowserManager();
    await manager.launch();

    mockGoto.mockRejectedValueOnce(
      new Error('page.goto: net::ERR_CONNECTION_REFUSED at https://localhost:9999/\nCall log:\n  - navigating')
    );

    await expect(manager.navigate('https://localhost:9999')).rejects.toThrow(
      'Connection refused. The server at "https://localhost:9999" is not accepting connections.'
    );
  });

  it('wraps ERR_CONNECTION_TIMED_OUT with user-friendly message', async () => {
    const manager = createBrowserManager();
    await manager.launch();

    mockGoto.mockRejectedValueOnce(
      new Error('page.goto: net::ERR_CONNECTION_TIMED_OUT\nCall log:\n  - navigating')
    );

    await expect(manager.navigate('https://slow.example')).rejects.toThrow(
      'Connection timed out while loading "https://slow.example".'
    );
  });

  it('wraps SSL errors with user-friendly message', async () => {
    const manager = createBrowserManager();
    await manager.launch();

    mockGoto.mockRejectedValueOnce(
      new Error('page.goto: net::ERR_CERT_AUTHORITY_INVALID\nCall log:\n  - navigating')
    );

    await expect(manager.navigate('https://selfsigned.example')).rejects.toThrow(
      'SSL/certificate error while loading "https://selfsigned.example".'
    );
  });

  it('strips Call log from unknown errors', async () => {
    const manager = createBrowserManager();
    await manager.launch();

    mockGoto.mockRejectedValueOnce(
      new Error('page.goto: some unknown error\nCall log:\n  - navigating\n  - waiting')
    );

    await expect(manager.navigate('https://example.com')).rejects.toThrow(
      'Failed to navigate to "https://example.com": page.goto: some unknown error'
    );
  });

  it('throws when browser not launched', async () => {
    const manager = createBrowserManager();

    await expect(manager.navigate('https://example.com')).rejects.toThrow(
      'Browser not launched'
    );
  });
});
