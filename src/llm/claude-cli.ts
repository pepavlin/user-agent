import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
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

const TMP_DIR = './tmp/llm-images';

const ensureTmpDir = async () => {
  await mkdir(TMP_DIR, { recursive: true });
};

const parseJsonResponse = <T>(text: string): T => {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse JSON from response: ${text}`);
  }
  return JSON.parse(jsonMatch[0]) as T;
};

const callClaudeCLI = async (
  prompt: string,
  imagePath?: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> => {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'text'];

    if (imagePath) {
      args.push('--add-file', imagePath);
    }

    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        return;
      }

      // CLI doesn't report token usage, estimate based on text length
      const estimatedInputTokens = Math.ceil(prompt.length / 4);
      const estimatedOutputTokens = Math.ceil(stdout.length / 4);

      resolve({
        text: stdout,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
      });
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to spawn claude CLI: ${error.message}`));
    });
  });
};

const saveImageToTmp = async (image: Buffer): Promise<string> => {
  await ensureTmpDir();
  const filename = `${randomUUID()}.png`;
  const filepath = join(TMP_DIR, filename);
  await writeFile(filepath, image);
  return filepath;
};

const cleanupImage = async (filepath: string): Promise<void> => {
  try {
    await unlink(filepath);
  } catch {
    // Ignore cleanup errors
  }
};

export const createClaudeCLI = (): LLMProvider => {
  return {
    async analyzeScreen(input: AnalyzeInput): Promise<LLMResponse<ScreenAnalysis>> {
      const prompt = createAnalyzePrompt(input.persona, input.context, input.snapshot);
      const imagePath = await saveImageToTmp(input.screenshot);

      try {
        const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt, imagePath);
        return {
          data: parseJsonResponse<ScreenAnalysis>(text),
          usage: { inputTokens, outputTokens },
        };
      } finally {
        await cleanupImage(imagePath);
      }
    },

    async formulateExpectation(input: ExpectationInput): Promise<LLMResponse<Expectation>> {
      const prompt = createExpectationPrompt(input.persona, input.analysis, input.context);
      const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt);

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
      const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt);

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
      const imagePath = await saveImageToTmp(input.afterScreenshot);

      try {
        const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt, imagePath);
        return {
          data: parseJsonResponse<Evaluation>(text),
          usage: { inputTokens, outputTokens },
        };
      } finally {
        await cleanupImage(imagePath);
      }
    },

    async summarizeContext(input: SummarizeInput): Promise<LLMResponse<string>> {
      const prompt = createSummarizePrompt(
        input.persona,
        input.previousSummary,
        input.latestStep.action,
        input.latestStep.evaluation
      );
      const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt);

      return {
        data: text.trim(),
        usage: { inputTokens, outputTokens },
      };
    },
  };
};
