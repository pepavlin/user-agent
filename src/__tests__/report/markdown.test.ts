import { describe, it, expect } from 'vitest';
import { formatDuration, evaluationEmoji, formatStep, generateMarkdown } from '@/report/markdown';
import type { StepResult, SessionReport, EvaluationResult } from '@/core/types';

const makeStep = (overrides: Partial<StepResult> = {}): StepResult => ({
  stepNumber: 1,
  timestamp: Date.now(),
  screenshot: Buffer.from(''),
  analysis: { description: 'Login page with form', mainElements: ['login form', 'submit button'], observations: [] },
  expectation: { what: 'I expect to see a login form' },
  action: { action: 'click', elementId: 'btn-submit', reasoning: 'Submit the form' },
  evaluation: {
    result: 'met',
    reality: 'Form submitted successfully',
    notes: ['Login was smooth'],
    suggestions: [],
    userQuote: 'That was easy!',
  },
  ...overrides,
});

const makeReport = (overrides: Partial<SessionReport> = {}): SessionReport => ({
  config: {
    url: 'https://example.com',
    persona: 'Jana, 45 let',
    intent: 'Log in',
    explore: false,
    maxSteps: 10,
    timeout: 300,
    waitBetweenActions: 3,
    outputPath: './report.md',
    debug: false,
    budgetCZK: 50,
  },
  startTime: 1000000,
  endTime: 1045000,
  steps: [makeStep()],
  summary: {
    totalSteps: 1,
    intuitivenessScore: 10,
    issuesFound: [],
    improvements: [],
    userQuotes: ['That was easy!'],
  },
  cost: {
    inputTokens: 1000,
    outputTokens: 500,
    totalCostUSD: 0.0105,
    totalCostCZK: 0.25,
  },
  ...overrides,
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(45000)).toBe('45s');
  });

  it('formats minutes + seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

describe('evaluationEmoji', () => {
  it('returns correct emoji for each result type', () => {
    expect(evaluationEmoji('met')).toBe('\u2705');
    expect(evaluationEmoji('unmet')).toBe('\u274C');
    expect(evaluationEmoji('partial')).toBe('\u26A0\uFE0F');
    expect(evaluationEmoji('surprised')).toBe('\u2753');
  });
});

describe('formatStep', () => {
  it('includes all required sections', () => {
    const output = formatStep(makeStep());

    expect(output).toContain('## Step 1');
    expect(output).toContain('**Saw:**');
    expect(output).toContain('**Expected:**');
    expect(output).toContain('**Action:**');
    expect(output).toContain('**Result:**');
    expect(output).toContain('**Evaluation:**');
    expect(output).toContain('MET');
    expect(output).toContain('**Notes:**');
    expect(output).toContain('That was easy!');
  });
});

describe('generateMarkdown', () => {
  it('includes header, session info, steps, summary, cost', () => {
    const output = generateMarkdown(makeReport());

    // Header
    expect(output).toContain('# UserAgent Session Report');

    // Session info
    expect(output).toContain('## Session Info');
    expect(output).toContain('https://example.com');
    expect(output).toContain('Jana, 45 let');
    expect(output).toContain('Log in');

    // Steps
    expect(output).toContain('# Timeline');
    expect(output).toContain('## Step 1');

    // Summary
    expect(output).toContain('# Summary');
    expect(output).toContain('Intuitiveness Score');

    // Cost
    expect(output).toContain('## Session Cost');
    expect(output).toContain('Input tokens');
    expect(output).toContain('Output tokens');
  });
});
