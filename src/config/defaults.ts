export const defaults = {
  maxSteps: 10,
  timeout: 300,
  waitBetweenActions: 10,
  outputPath: './report.md',
  debug: false as false | 'debug' | 'ultra',
  budgetCZK: 5,
  czkPerUsd: 23.5,
} as const;

export type Defaults = typeof defaults;
