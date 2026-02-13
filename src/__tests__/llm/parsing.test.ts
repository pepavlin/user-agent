import { describe, it, expect } from 'vitest';
import { parseJsonResponse } from '@/llm/claude-cli';

describe('parseJsonResponse', () => {
  it('extracts JSON from mixed text', () => {
    const text = 'Here is the analysis:\n{"description": "A login page", "score": 8}\nEnd of response.';
    const result = parseJsonResponse<{ description: string; score: number }>(text);
    expect(result.description).toBe('A login page');
    expect(result.score).toBe(8);
  });

  it('handles clean JSON', () => {
    const text = '{"action": "click", "elementId": "btn-1"}';
    const result = parseJsonResponse<{ action: string; elementId: string }>(text);
    expect(result.action).toBe('click');
    expect(result.elementId).toBe('btn-1');
  });

  it('throws on no JSON found', () => {
    expect(() => parseJsonResponse('No JSON here at all')).toThrow('Failed to parse JSON');
  });

  it('handles nested objects', () => {
    const text = '{"outer": {"inner": {"value": 42}}, "list": [1, 2, 3]}';
    const result = parseJsonResponse<{ outer: { inner: { value: number } }; list: number[] }>(text);
    expect(result.outer.inner.value).toBe(42);
    expect(result.list).toEqual([1, 2, 3]);
  });
});
