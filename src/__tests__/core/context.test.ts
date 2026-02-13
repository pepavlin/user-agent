import { describe, it, expect } from 'vitest';
import { createInitialContext, updateContext } from '@/core/context';
import type { StepResult } from '@/core/types';

const makeStepResult = (notes: string[] = [], overrides: Partial<StepResult> = {}): StepResult => ({
  stepNumber: 1,
  timestamp: Date.now(),
  screenshot: Buffer.from(''),
  analysis: { description: 'test', mainElements: [], observations: [] },
  expectation: { what: 'test' },
  action: { action: 'click', reasoning: 'test' },
  evaluation: {
    result: 'met',
    reality: 'test',
    notes,
    suggestions: [],
  },
  ...overrides,
});

describe('createInitialContext', () => {
  it('creates context with intent', () => {
    const ctx = createInitialContext('find music');
    expect(ctx.intent).toBe('find music');
    expect(ctx.currentSummary).toBe('');
    expect(ctx.stepCount).toBe(0);
    expect(ctx.issuesFound).toEqual([]);
    expect(ctx.pageContext).toBeUndefined();
  });

  it('creates context without intent', () => {
    const ctx = createInitialContext();
    expect(ctx.intent).toBeUndefined();
    expect(ctx.stepCount).toBe(0);
  });

  it('creates context with pageContext', () => {
    const ctx = createInitialContext('intent', 'This is a music streaming app');
    expect(ctx.pageContext).toBe('This is a music streaming app');
    expect(ctx.intent).toBe('intent');
  });
});

describe('updateContext', () => {
  it('increments stepCount', () => {
    const ctx = createInitialContext();
    const updated = updateContext(ctx, makeStepResult(), 'summary');
    expect(updated.stepCount).toBe(1);

    const updated2 = updateContext(updated, makeStepResult(), 'summary2');
    expect(updated2.stepCount).toBe(2);
  });

  it('updates currentSummary', () => {
    const ctx = createInitialContext();
    const updated = updateContext(ctx, makeStepResult(), 'new summary text');
    expect(updated.currentSummary).toBe('new summary text');
  });

  it('detects English issue keywords in notes', () => {
    const ctx = createInitialContext();
    const step = makeStepResult(['The button is broken and confusing']);
    const updated = updateContext(ctx, step, 'summary');
    expect(updated.issuesFound.length).toBeGreaterThan(0);
    expect(updated.issuesFound).toContain('The button is broken and confusing');
  });

  it('detects Czech issue keywords in notes', () => {
    const ctx = createInitialContext();
    const step = makeStepResult(['Formulář nefunguje správně']);
    const updated = updateContext(ctx, step, 'summary');
    expect(updated.issuesFound).toContain('Formulář nefunguje správně');
  });

  it('does NOT flag clean notes as issues', () => {
    const ctx = createInitialContext();
    const step = makeStepResult(['The page loaded successfully', 'User clicked the button']);
    const updated = updateContext(ctx, step, 'summary');
    expect(updated.issuesFound).toEqual([]);
  });

  it('preserves existing issues (no loss)', () => {
    let ctx = createInitialContext();
    const step1 = makeStepResult(['The button is broken']);
    ctx = updateContext(ctx, step1, 'summary1');
    expect(ctx.issuesFound).toHaveLength(1);

    const step2 = makeStepResult(['Navigation is confusing']);
    ctx = updateContext(ctx, step2, 'summary2');
    expect(ctx.issuesFound).toHaveLength(2);
    expect(ctx.issuesFound).toContain('The button is broken');
    expect(ctx.issuesFound).toContain('Navigation is confusing');
  });
});
