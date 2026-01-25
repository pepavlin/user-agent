// Session configuration from CLI
export type SessionConfig = {
  url: string;
  persona: string;
  intent?: string;
  explore: boolean;
  maxSteps: number;
  timeout: number;
  waitBetweenActions: number;
  credentials?: Credentials;
  outputPath: string;
  debug: false | 'debug' | 'ultra';
  budgetCZK: number;
};

export type Credentials = {
  [key: string]: string;
};

// Context maintained between steps
export type SessionContext = {
  intent?: string;
  pageContext?: string;       // Initial understanding of what this page/app is
  currentSummary: string;
  lastStepResult?: StepResult;
  stepCount: number;
  issuesFound: string[];
};

// Result of a single step
export type StepResult = {
  stepNumber: number;
  timestamp: number;
  screenshot: Buffer;
  analysis: ScreenAnalysis;
  expectation: Expectation;
  action: ActionDecision;
  evaluation: Evaluation;
};

// What AI sees on screen
export type ScreenAnalysis = {
  description: string;
  mainElements: string[];
  observations: string[];
};

// What AI expects to happen
export type Expectation = {
  what: string;
  expectedTime?: string;
  confidence: 'high' | 'medium' | 'low';
};

// Action decision from AI
export type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'navigate' | 'read';

export type ActionDecision = {
  action: ActionType;
  elementId?: string;
  value?: string;
  reasoning: string;
};

// Evaluation after action
export type EvaluationResult = 'met' | 'unmet' | 'partial' | 'surprised';

export type Evaluation = {
  result: EvaluationResult;
  reality: string;
  notes: string[];
  suggestions: string[];
  userQuote?: string;
};

// Final session report
export type SessionReport = {
  config: SessionConfig;
  startTime: number;
  endTime: number;
  steps: StepResult[];
  summary: SessionSummary;
  cost: CostSummary;
};

export type SessionSummary = {
  totalSteps: number;
  intuitivenessScore: number;
  issuesFound: string[];
  improvements: string[];
  userQuotes: string[];
};

export type CostSummary = {
  inputTokens: number;
  outputTokens: number;
  totalCostUSD: number;
  totalCostCZK: number;
};
