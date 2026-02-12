import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import type {
  LLMProvider,
  LLMResponse,
  AnalyzeInput,
  ExpectationInput,
  DecisionInput,
  ExpectAndDecideInput,
  ExpectAndDecideResult,
  EvaluationInput,
  SummarizeInput,
  PageContextInput,
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
  createExpectAndDecidePrompt,
  createEvaluationPrompt,
  createSummarizePrompt,
  createPageContextPrompt,
} from './prompts/index.js';

const TMP_DIR = resolve('./tmp/llm-images');

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

const CLI_TIMEOUT_MS = 180000; // 180 second timeout (3 minutes)
const MAX_RETRIES = 3;

// Simple retry wrapper for JSON parsing - just retries silently
const withRetry = async <T>(
  fn: () => Promise<T>,
  _operationName: string
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === MAX_RETRIES) {
        throw lastError;
      }
    }
  }

  throw lastError;
};

const callClaudeCLI = async (
  prompt: string,
  imagePath?: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> => {
  return new Promise((resolvePromise, reject) => {
    // If image path provided, prepend instruction to read the screenshot
    const fullPrompt = imagePath
      ? `First, read and analyze the screenshot at: ${imagePath}\n\nThen answer:\n${prompt}`
      : prompt;

    const args = ['-p', fullPrompt, '--output-format', 'text', '--dangerously-skip-permissions'];

    // Remove ANTHROPIC_API_KEY so Claude CLI uses CLAUDE_CODE_OAUTH_TOKEN instead
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    // Close stdin immediately since we don't need it
    child.stdin.end();

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      reject(new Error(`Claude CLI timed out after ${CLI_TIMEOUT_MS / 1000}s`));
    }, CLI_TIMEOUT_MS);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (timedOut) return; // Already rejected

      if (code !== 0) {
        const errorDetail = stderr || stdout || '(no output)';
        reject(new Error(`Claude CLI exited with code ${code}: ${errorDetail}`));
        return;
      }

      // CLI doesn't report token usage, estimate based on text length
      const estimatedInputTokens = Math.ceil(prompt.length / 4);
      const estimatedOutputTokens = Math.ceil(stdout.length / 4);

      resolvePromise({
        text: stdout,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
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
    async getPageContext(input: PageContextInput): Promise<LLMResponse<string>> {
      const prompt = createPageContextPrompt(input.snapshot);
      const imagePath = await saveImageToTmp(input.screenshot);

      try {
        const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt, imagePath);
        return {
          data: text.trim(),
          usage: { inputTokens, outputTokens },
        };
      } finally {
        await cleanupImage(imagePath);
      }
    },

    async analyzeScreen(input: AnalyzeInput): Promise<LLMResponse<ScreenAnalysis>> {
      const prompt = createAnalyzePrompt(input.persona, input.context, input.snapshot);
      const imagePath = await saveImageToTmp(input.screenshot);

      try {
        return await withRetry(async () => {
          const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt, imagePath);
          return {
            data: parseJsonResponse<ScreenAnalysis>(text),
            usage: { inputTokens, outputTokens },
          };
        }, 'analyzeScreen');
      } finally {
        await cleanupImage(imagePath);
      }
    },

    async formulateExpectation(input: ExpectationInput): Promise<LLMResponse<Expectation>> {
      const prompt = createExpectationPrompt(input.persona, input.analysis, input.context);

      return withRetry(async () => {
        const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt);
        return {
          data: parseJsonResponse<Expectation>(text),
          usage: { inputTokens, outputTokens },
        };
      }, 'formulateExpectation');
    },

    async decideAction(input: DecisionInput): Promise<LLMResponse<ActionDecision>> {
      const prompt = createDecisionPrompt(
        input.persona,
        input.analysis,
        input.expectation,
        input.snapshot,
        input.context
      );

      return withRetry(async () => {
        const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt);
        return {
          data: parseJsonResponse<ActionDecision>(text),
          usage: { inputTokens, outputTokens },
        };
      }, 'decideAction');
    },

    async expectAndDecide(input: ExpectAndDecideInput): Promise<LLMResponse<ExpectAndDecideResult>> {
      const prompt = createExpectAndDecidePrompt(
        input.persona,
        input.analysis,
        input.snapshot,
        input.context
      );

      return withRetry(async () => {
        const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt);
        const parsed = parseJsonResponse<{ expectation: { what: string; expectedTime?: string; confidence?: 'high' | 'medium' | 'low' }; decision: ActionDecision }>(text);
        return {
          data: {
            expectation: {
              what: parsed.expectation.what,
              expectedTime: parsed.expectation.expectedTime,
              confidence: parsed.expectation.confidence,
            },
            decision: parsed.decision,
          },
          usage: { inputTokens, outputTokens },
        };
      }, 'expectAndDecide');
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
        return await withRetry(async () => {
          const { text, inputTokens, outputTokens } = await callClaudeCLI(prompt, imagePath);
          return {
            data: parseJsonResponse<Evaluation>(text),
            usage: { inputTokens, outputTokens },
          };
        }, 'evaluateResult');
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
