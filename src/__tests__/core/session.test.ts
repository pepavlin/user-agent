import { describe, it, expect } from 'vitest';
import { calculateIntuitivenessScore, generateSummary } from '@/core/session';
import type { StepResult, EvaluationResult } from '@/core/types';

const makeStep = (result: EvaluationResult, overrides: Partial<StepResult['evaluation']> = {}): StepResult => ({
  stepNumber: 1,
  timestamp: Date.now(),
  screenshot: Buffer.from(''),
  analysis: { description: 'test', mainElements: [], observations: [] },
  expectation: { what: 'test' },
  action: { action: 'click', reasoning: 'test' },
  evaluation: {
    result,
    reality: 'test',
    notes: [],
    suggestions: [],
    ...overrides,
  },
});

describe('calculateIntuitivenessScore', () => {
  it('returns 10 for all met steps', () => {
    const steps = [makeStep('met'), makeStep('met'), makeStep('met')];
    expect(calculateIntuitivenessScore(steps)).toBe(10);
  });

  it('deducts 1 for partial', () => {
    const steps = [makeStep('met'), makeStep('partial')];
    expect(calculateIntuitivenessScore(steps)).toBe(9);
  });

  it('deducts 2 for unmet', () => {
    const steps = [makeStep('met'), makeStep('unmet')];
    expect(calculateIntuitivenessScore(steps)).toBe(8);
  });

  it('deducts 1.5 for surprised', () => {
    const steps = [makeStep('met'), makeStep('surprised')];
    expect(calculateIntuitivenessScore(steps)).toBe(8.5);
  });

  it('clamps to 0 (does not go negative)', () => {
    const steps = Array(10).fill(null).map(() => makeStep('unmet'));
    // 10 - (10*2) = -10, clamped to 0
    expect(calculateIntuitivenessScore(steps)).toBe(0);
  });

  it('clamps to 10 (does not exceed max)', () => {
    const steps = [makeStep('met')];
    expect(calculateIntuitivenessScore(steps)).toBeLessThanOrEqual(10);
  });

  it('returns 5 for empty steps', () => {
    expect(calculateIntuitivenessScore([])).toBe(5);
  });
});

describe('generateSummary', () => {
  it('deduplicates issues, improvements, quotes', () => {
    const steps = [
      makeStep('met', {
        suggestions: ['improve contrast', 'improve contrast'],
        userQuote: 'This is hard',
      }),
      makeStep('partial', {
        suggestions: ['improve contrast', 'add labels'],
        userQuote: 'This is hard',
      }),
    ];

    const context = { issuesFound: ['broken button', 'broken button', 'slow load'] };
    const summary = generateSummary(steps, context);

    expect(summary.improvements).toEqual(['improve contrast', 'add labels']);
    expect(summary.userQuotes).toEqual(['This is hard']);
    expect(summary.issuesFound).toEqual(['broken button', 'slow load']);
  });

  it('includes totalSteps and intuitivenessScore', () => {
    const steps = [makeStep('met'), makeStep('unmet')];
    const summary = generateSummary(steps, { issuesFound: [] });
    expect(summary.totalSteps).toBe(2);
    expect(summary.intuitivenessScore).toBe(8);
  });
});
