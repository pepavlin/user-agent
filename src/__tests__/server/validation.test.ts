import { describe, it, expect } from 'vitest';
import { validateCreateRequest, authenticateRequest } from '@/server/index';

describe('validateCreateRequest', () => {
  it('accepts valid minimal request (url + persona only)', () => {
    const result = validateCreateRequest({ url: 'https://example.com', persona: 'Jana, 45 let' });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.url).toBe('https://example.com');
      expect(result.data.persona).toBe('Jana, 45 let');
    }
  });

  it('accepts valid full request (all fields)', () => {
    const result = validateCreateRequest({
      url: 'https://example.com',
      persona: 'Viktor',
      intent: 'Log in',
      maxSteps: 15,
      timeout: 600,
      waitBetweenActions: 5,
      budgetCZK: 10,
      credentials: { email: 'user@test.com', password: 'secret' },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.maxSteps).toBe(15);
      expect(result.data.timeout).toBe(600);
      expect(result.data.budgetCZK).toBe(10);
      expect(result.data.credentials).toEqual({ email: 'user@test.com', password: 'secret' });
    }
  });

  it('rejects missing url', () => {
    const result = validateCreateRequest({ persona: 'Jana' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('url');
  });

  it('rejects missing persona', () => {
    const result = validateCreateRequest({ url: 'https://example.com' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('persona');
  });

  it('rejects invalid URL format', () => {
    const result = validateCreateRequest({ url: 'not-a-url', persona: 'Jana' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('url');
  });

  it('rejects maxSteps out of range (0)', () => {
    const result = validateCreateRequest({ url: 'https://a.com', persona: 'J', maxSteps: 0 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('maxSteps');
  });

  it('rejects maxSteps out of range (51)', () => {
    const result = validateCreateRequest({ url: 'https://a.com', persona: 'J', maxSteps: 51 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('maxSteps');
  });

  it('rejects timeout out of range', () => {
    const result = validateCreateRequest({ url: 'https://a.com', persona: 'J', timeout: 5 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('timeout');
  });

  it('rejects budgetCZK < 1', () => {
    const result = validateCreateRequest({ url: 'https://a.com', persona: 'J', budgetCZK: 0 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('budgetCZK');
  });

  it('rejects non-object body', () => {
    expect(validateCreateRequest(null).valid).toBe(false);
    expect(validateCreateRequest('string').valid).toBe(false);
    expect(validateCreateRequest(42).valid).toBe(false);
    expect(validateCreateRequest(undefined).valid).toBe(false);
  });
});

describe('authenticateRequest', () => {
  const makeRequest = (headers: Record<string, string | undefined> = {}) => ({
    headers: headers as Record<string, string | string[] | undefined>,
  });

  it('returns true when no API_KEY is set', () => {
    expect(authenticateRequest(undefined, makeRequest())).toBe(true);
  });

  it('returns true with matching X-API-Key header', () => {
    expect(authenticateRequest('secret123', makeRequest({ 'x-api-key': 'secret123' }))).toBe(true);
  });

  it('returns true with matching Bearer token', () => {
    expect(authenticateRequest('secret123', makeRequest({ authorization: 'Bearer secret123' }))).toBe(true);
  });

  it('returns false with wrong key', () => {
    expect(authenticateRequest('secret123', makeRequest({ 'x-api-key': 'wrong' }))).toBe(false);
  });

  it('returns false with no auth headers when key is set', () => {
    expect(authenticateRequest('secret123', makeRequest())).toBe(false);
  });
});
