import type {
  ScreenAnalysis,
  Expectation,
  ActionDecision,
  Evaluation,
  SessionContext,
} from '../core/types.js';
import type { SnapshotElement } from '../vision/types.js';

// Input for screen analysis
export type AnalyzeInput = {
  screenshot: Buffer;
  snapshot: SnapshotElement[];
  persona: string;
  context: SessionContext;
};

// Input for expectation formulation
export type ExpectationInput = {
  analysis: ScreenAnalysis;
  persona: string;
  context: SessionContext;
};

// Input for action decision
export type DecisionInput = {
  analysis: ScreenAnalysis;
  expectation: Expectation;
  snapshot: SnapshotElement[];
  persona: string;
  context: SessionContext;
};

// Input for evaluation
export type EvaluationInput = {
  expectation: Expectation;
  action: ActionDecision;
  beforeScreenshot: Buffer;
  afterScreenshot: Buffer;
  persona: string;
  context: SessionContext;
};

// Input for context summarization
export type SummarizeInput = {
  previousSummary: string;
  latestStep: {
    action: ActionDecision;
    evaluation: Evaluation;
  };
  persona: string;
};

// LLM response with token usage
export type LLMResponse<T> = {
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

// LLM provider type
export type LLMProvider = {
  analyzeScreen(input: AnalyzeInput): Promise<LLMResponse<ScreenAnalysis>>;
  formulateExpectation(input: ExpectationInput): Promise<LLMResponse<Expectation>>;
  decideAction(input: DecisionInput): Promise<LLMResponse<ActionDecision>>;
  evaluateResult(input: EvaluationInput): Promise<LLMResponse<Evaluation>>;
  summarizeContext(input: SummarizeInput): Promise<LLMResponse<string>>;
};
