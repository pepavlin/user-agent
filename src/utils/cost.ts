import type { CostTracker } from './types.js';

// Claude pricing (as of 2024)
// Claude 3.5 Sonnet: $3/1M input, $15/1M output
const PRICE_PER_INPUT_TOKEN_USD = 3 / 1_000_000;
const PRICE_PER_OUTPUT_TOKEN_USD = 15 / 1_000_000;

export const createCostTracker = (budgetCZK: number, czkPerUsd: number): CostTracker => {
  let inputTokens = 0;
  let outputTokens = 0;

  return {
    addUsage(input: number, output: number) {
      inputTokens += input;
      outputTokens += output;
    },

    getTotalCostUSD() {
      return (
        inputTokens * PRICE_PER_INPUT_TOKEN_USD +
        outputTokens * PRICE_PER_OUTPUT_TOKEN_USD
      );
    },

    getTotalCostCZK() {
      return this.getTotalCostUSD() * czkPerUsd;
    },

    getInputTokens() {
      return inputTokens;
    },

    getOutputTokens() {
      return outputTokens;
    },

    isOverBudget() {
      return this.getTotalCostCZK() > budgetCZK;
    },
  };
};
