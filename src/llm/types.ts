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

// Input for action decision (legacy, kept for compatibility)
export type DecisionInput = {
  analysis: ScreenAnalysis;
  expectation: Expectation;
  snapshot: SnapshotElement[];
  persona: string;
  context: SessionContext;
};

// Combined input for expectation + decision (optimized)
export type ExpectAndDecideInput = {
  analysis: ScreenAnalysis;
  snapshot: SnapshotElement[];
  persona: string;
  context: SessionContext;
};

// Combined output for expectation + decision
export type ExpectAndDecideResult = {
  expectation: Expectation;
  decision: ActionDecision;
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

// Input for page context extraction
export type PageContextInput = {
  screenshot: Buffer;
  snapshot: SnapshotElement[];
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
  getPageContext(input: PageContextInput): Promise<LLMResponse<string>>;
  analyzeScreen(input: AnalyzeInput): Promise<LLMResponse<ScreenAnalysis>>;
  formulateExpectation(input: ExpectationInput): Promise<LLMResponse<Expectation>>;
  decideAction(input: DecisionInput): Promise<LLMResponse<ActionDecision>>;
  // Combined expectation + decision (optimized - one LLM call instead of two)
  expectAndDecide(input: ExpectAndDecideInput): Promise<LLMResponse<ExpectAndDecideResult>>;
  evaluateResult(input: EvaluationInput): Promise<LLMResponse<Evaluation>>;
  summarizeContext(input: SummarizeInput): Promise<LLMResponse<string>>;
};
