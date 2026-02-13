import { describe, it, expect } from 'vitest';
import { createCostTracker } from '@/utils/cost';

describe('createCostTracker', () => {
  it('returns correct initial state (0 tokens, $0)', () => {
    const tracker = createCostTracker(50, 23.5);
    expect(tracker.getInputTokens()).toBe(0);
    expect(tracker.getOutputTokens()).toBe(0);
    expect(tracker.getTotalCostUSD()).toBe(0);
    expect(tracker.getTotalCostCZK()).toBe(0);
  });

  it('addUsage() accumulates tokens correctly', () => {
    const tracker = createCostTracker(50, 23.5);
    tracker.addUsage(100, 50);
    tracker.addUsage(200, 100);
    expect(tracker.getInputTokens()).toBe(300);
    expect(tracker.getOutputTokens()).toBe(150);
  });

  it('getTotalCostUSD() calculates correctly ($3/1M input, $15/1M output)', () => {
    const tracker = createCostTracker(50, 23.5);
    tracker.addUsage(1_000_000, 0);
    expect(tracker.getTotalCostUSD()).toBeCloseTo(3, 5);

    const tracker2 = createCostTracker(50, 23.5);
    tracker2.addUsage(0, 1_000_000);
    expect(tracker2.getTotalCostUSD()).toBeCloseTo(15, 5);

    const tracker3 = createCostTracker(50, 23.5);
    tracker3.addUsage(1_000_000, 1_000_000);
    expect(tracker3.getTotalCostUSD()).toBeCloseTo(18, 5);
  });

  it('getTotalCostCZK() applies exchange rate', () => {
    const tracker = createCostTracker(50, 25);
    tracker.addUsage(1_000_000, 0); // $3
    expect(tracker.getTotalCostCZK()).toBeCloseTo(75, 5); // $3 * 25
  });

  it('isOverBudget() returns false under budget', () => {
    const tracker = createCostTracker(100, 25);
    tracker.addUsage(1_000_000, 0); // $3 = 75 CZK
    expect(tracker.isOverBudget()).toBe(false);
  });

  it('isOverBudget() returns true over budget', () => {
    const tracker = createCostTracker(10, 25);
    tracker.addUsage(1_000_000, 0); // $3 = 75 CZK > 10 CZK
    expect(tracker.isOverBudget()).toBe(true);
  });
});
