import type { LLMProvider } from './types.js';
import { createClaudeLLM } from './claude.js';

export type LLMProviderType = 'claude' | 'openai';

export const createLLMProvider = (type: LLMProviderType = 'claude'): LLMProvider => {
  switch (type) {
    case 'claude':
      return createClaudeLLM();
    case 'openai':
      throw new Error('OpenAI provider not implemented yet');
    default:
      throw new Error(`Unknown LLM provider: ${type}`);
  }
};

export type {
  LLMProvider,
  LLMResponse,
  AnalyzeInput,
  ExpectationInput,
  DecisionInput,
  EvaluationInput,
  SummarizeInput,
} from './types.js';
