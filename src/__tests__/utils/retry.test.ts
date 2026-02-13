import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '@/utils/retry';

describe('withRetry', () => {
  it('succeeds on first attempt (no retry)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on 2nd attempt after 1 failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { delayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after all attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { attempts: 2, delayMs: 1 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff: delay = delayMs * attempt', async () => {
    const sleepSpy = vi.spyOn(globalThis, 'setTimeout');
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    await withRetry(fn, { attempts: 3, delayMs: 10, backoff: true });

    // With backoff: attempt 1 delay = 10*1=10, attempt 2 delay = 10*2=20
    const delays = sleepSpy.mock.calls
      .map(call => call[1])
      .filter((d): d is number => typeof d === 'number' && d >= 10 && d <= 20);
    expect(delays).toEqual([10, 20]);

    sleepSpy.mockRestore();
  });

  it('uses flat delay when backoff=false', async () => {
    const sleepSpy = vi.spyOn(globalThis, 'setTimeout');
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    await withRetry(fn, { attempts: 3, delayMs: 10, backoff: false });

    // Without backoff: both delays should be 10
    const delays = sleepSpy.mock.calls
      .map(call => call[1])
      .filter((d): d is number => d === 10);
    expect(delays).toEqual([10, 10]);

    sleepSpy.mockRestore();
  });

  it('respects custom attempts option', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, { attempts: 5, delayMs: 1 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('wraps non-Error throws into Error', async () => {
    const fn = vi.fn().mockRejectedValue('string error');
    await expect(withRetry(fn, { attempts: 1 })).rejects.toThrow('string error');
    const err = await withRetry(fn, { attempts: 1 }).catch(e => e);
    expect(err).toBeInstanceOf(Error);
  });
});
