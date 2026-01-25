// Logger type
export type DebugLevel = false | 'debug' | 'ultra';

export type Logger = {
  info(message: string): void;
  debug(message: string): void;
  error(message: string, error?: Error): void;
  step(stepNumber: number, message: string): void;
  saveLLMResponse(stepNumber: number, type: string, data: unknown): void;
  saveScreenshot(stepNumber: number, name: string, data: Buffer): void;
};

// Cost tracker type
export type CostTracker = {
  addUsage(inputTokens: number, outputTokens: number): void;
  getTotalCostUSD(): number;
  getTotalCostCZK(): number;
  getInputTokens(): number;
  getOutputTokens(): number;
  isOverBudget(): boolean;
};
