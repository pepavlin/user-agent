import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  LLMResponse,
  AnalyzeInput,
  ExpectationInput,
  DecisionInput,
  EvaluationInput,
  SummarizeInput,
} from './types.js';
import type {
  ScreenAnalysis,
  Expectation,
  ActionDecision,
  Evaluation,
} from '../core/types.js';
import {
  createAnalyzePrompt,
  createExpectationPrompt,
  createDecisionPrompt,
  createEvaluationPrompt,
  createSummarizePrompt,
} from './prompts/index.js';

const MODEL = 'claude-sonnet-4-20250514';

const parseJsonResponse = <T>(text: string): T => {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse JSON from response: ${text}`);
  }
  return JSON.parse(jsonMatch[0]) as T;
};

export const createClaudeLLM = (): LLMProvider => {
  const client = new Anthropic();

  const callWithImage = async (
    prompt: string,
    image?: Buffer
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> => {
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    if (image) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: image.toString('base64'),
        },
      });
    }

    content.push({
      type: 'text',
      text: prompt,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const text = textContent && 'text' in textContent ? textContent.text : '';

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  };

  return {
    async analyzeScreen(input: AnalyzeInput): Promise<LLMResponse<ScreenAnalysis>> {
      const prompt = createAnalyzePrompt(input.persona, input.context, input.snapshot);
      const { text, inputTokens, outputTokens } = await callWithImage(prompt, input.screenshot);

      return {
        data: parseJsonResponse<ScreenAnalysis>(text),
        usage: { inputTokens, outputTokens },
      };
    },

    async formulateExpectation(input: ExpectationInput): Promise<LLMResponse<Expectation>> {
      const prompt = createExpectationPrompt(input.persona, input.analysis, input.context);
      const { text, inputTokens, outputTokens } = await callWithImage(prompt);

      return {
        data: parseJsonResponse<Expectation>(text),
        usage: { inputTokens, outputTokens },
      };
    },

    async decideAction(input: DecisionInput): Promise<LLMResponse<ActionDecision>> {
      const prompt = createDecisionPrompt(
        input.persona,
        input.analysis,
        input.expectation,
        input.snapshot,
        input.context
      );
      const { text, inputTokens, outputTokens } = await callWithImage(prompt);

      return {
        data: parseJsonResponse<ActionDecision>(text),
        usage: { inputTokens, outputTokens },
      };
    },

    async evaluateResult(input: EvaluationInput): Promise<LLMResponse<Evaluation>> {
      const prompt = createEvaluationPrompt(
        input.persona,
        input.expectation,
        input.action,
        input.context
      );
      const { text, inputTokens, outputTokens } = await callWithImage(prompt, input.afterScreenshot);

      return {
        data: parseJsonResponse<Evaluation>(text),
        usage: { inputTokens, outputTokens },
      };
    },

    async summarizeContext(input: SummarizeInput): Promise<LLMResponse<string>> {
      const prompt = createSummarizePrompt(
        input.persona,
        input.previousSummary,
        input.latestStep.action,
        input.latestStep.evaluation
      );
      const { text, inputTokens, outputTokens } = await callWithImage(prompt);

      return {
        data: text.trim(),
        usage: { inputTokens, outputTokens },
      };
    },
  };
};
