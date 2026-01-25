import type { LLMProvider } from './types.js';
import { createClaudeLLM } from './claude.js';
import { createClaudeCLI } from './claude-cli.js';

export type LLMProviderType = 'claude' | 'claude-cli' | 'openai';

export const createLLMProvider = (type: LLMProviderType = 'claude-cli'): LLMProvider => {
  switch (type) {
    case 'claude-cli':
      return createClaudeCLI();
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
