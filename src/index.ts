/**
 * UserAgent - Programmatic API
 *
 * Simulate real human users to discover UX blind spots.
 *
 * @example
 * ```typescript
 * import { runTest, createTestConfig } from 'user-agent';
 *
 * const result = await runTest({
 *   url: 'https://example.com',
 *   persona: 'Senior user, 65, not tech-savvy',
 *   intent: 'Find contact page',
 * });
 *
 * console.log(`Score: ${result.report.summary.intuitivenessScore}/10`);
 * ```
 */

// Core session runner
export { runSession } from './core/session.js';
export type { SessionDependencies } from './core/session.js';

// Types
export type {
  SessionConfig,
  SessionReport,
  SessionContext,
  SessionSummary,
  StepResult,
  ScreenAnalysis,
  Expectation,
  ActionDecision,
  ActionType,
  InputFill,
  Evaluation,
  EvaluationResult,
  CostSummary,
  Credentials,
} from './core/types.js';

// LLM providers
export { createLLMProvider } from './llm/index.js';
export type { LLMProvider, LLMProviderType } from './llm/index.js';

// Browser
export { createBrowserManager } from './browser/index.js';
export type { BrowserManager } from './browser/types.js';

// Vision
export { createVisionProvider } from './vision/index.js';
export type { VisionProvider, VisionResult, SnapshotElement } from './vision/types.js';

// Reports
export { createMarkdownReportGenerator, buildJsonReport, saveJsonReport } from './report/index.js';
export type {
  ReportGenerator,
  JsonReport,
  JsonReportStep,
  JsonReportIssue,
  JsonReportPositive,
  JsonReportObservation,
} from './report/index.js';

// Utilities
export { createLogger, createCostTracker } from './utils/index.js';
export type { Logger, CostTracker, DebugLevel } from './utils/types.js';

// Config
export { defaults } from './config/defaults.js';
export { getPersonaPreset, listPersonaPresets, PERSONA_PRESETS } from './config/personas.js';
export type { PersonaPreset } from './config/personas.js';

// ============================================================================
// High-level API
// ============================================================================

import { runSession } from './core/session.js';
import { createBrowserManager } from './browser/index.js';
import { createLLMProvider, type LLMProviderType } from './llm/index.js';
import { createMarkdownReportGenerator, buildJsonReport, saveJsonReport } from './report/index.js';
import { createLogger, createCostTracker } from './utils/index.js';
import { defaults } from './config/defaults.js';
import { getPersonaPreset } from './config/personas.js';
import type { SessionConfig, SessionReport } from './core/types.js';
import type { JsonReport } from './report/index.js';
import type { DebugLevel } from './utils/types.js';

/**
 * Simple test configuration
 */
export type TestConfig = {
  /** Target URL to test */
  url: string;
  /** User persona description or preset name */
  persona: string;
  /** What the user wants to achieve (optional for explore mode) */
  intent?: string;
  /** Maximum number of steps */
  maxSteps?: number;
  /** Wait time between actions in seconds */
  waitBetweenActions?: number;
  /** Session timeout in seconds */
  timeout?: number;
  /** Maximum budget in CZK */
  budgetCZK?: number;
  /** LLM provider to use */
  llm?: LLMProviderType;
  /** Debug level */
  debug?: DebugLevel;
  /** Path to save Markdown report (optional) */
  markdownPath?: string;
  /** Path to save JSON report (optional) */
  jsonPath?: string;
  /** Login credentials */
  credentials?: Record<string, string>;
};

/**
 * Test result
 */
export type TestResult = {
  /** Full session report */
  report: SessionReport;
  /** JSON report (structured for automation) */
  json: JsonReport;
  /** Path to recorded video (if debug mode enabled) */
  videoPath?: string;
};

/**
 * Create a full SessionConfig from simplified TestConfig
 */
export const createTestConfig = (config: TestConfig): SessionConfig => {
  // Check if persona is a preset name
  const preset = getPersonaPreset(config.persona);
  const persona = preset ? preset.persona : config.persona;
  const intent = config.intent || (preset?.sampleIntents[0]);

  return {
    url: config.url,
    persona,
    intent,
    explore: !intent,
    maxSteps: config.maxSteps ?? defaults.maxSteps,
    timeout: config.timeout ?? defaults.timeout,
    waitBetweenActions: config.waitBetweenActions ?? defaults.waitBetweenActions,
    credentials: config.credentials,
    outputPath: config.markdownPath ?? './report.md',
    jsonOutputPath: config.jsonPath,
    debug: config.debug ?? false,
    budgetCZK: config.budgetCZK ?? defaults.budgetCZK,
  };
};

/**
 * Run a UX test with simplified configuration
 *
 * @example
 * ```typescript
 * const result = await runTest({
 *   url: 'https://example.com',
 *   persona: 'Senior user, 65, not tech-savvy',
 *   intent: 'Find contact page',
 * });
 *
 * // Check results
 * console.log(`Intuitiveness: ${result.report.summary.intuitivenessScore}/10`);
 * console.log(`Issues found: ${result.json.issues.length}`);
 *
 * // Access structured issues
 * for (const issue of result.json.issues) {
 *   console.log(`[${issue.severity}] ${issue.title}`);
 * }
 * ```
 *
 * @example Using persona preset
 * ```typescript
 * const result = await runTest({
 *   url: 'https://example.com',
 *   persona: 'senior', // Uses preset
 *   intent: 'Register for newsletter',
 * });
 * ```
 */
export const runTest = async (config: TestConfig): Promise<TestResult> => {
  const sessionConfig = createTestConfig(config);
  const llmProvider = config.llm ?? 'claude-cli';
  const debugLevel = config.debug ?? false;

  const browser = createBrowserManager();
  const llm = createLLMProvider(llmProvider);
  const reportGenerator = createMarkdownReportGenerator();
  const logger = createLogger(debugLevel);
  const costTracker = createCostTracker(sessionConfig.budgetCZK, defaults.czkPerUsd);

  const report = await runSession(sessionConfig, {
    llm,
    browser,
    logger,
    costTracker,
    reportGenerator,
  });

  const videoPath = browser.getVideoPath() ?? undefined;
  const json = buildJsonReport(report, videoPath);

  // Save JSON if path specified
  if (config.jsonPath) {
    await saveJsonReport(report, config.jsonPath, videoPath);
  }

  return {
    report,
    json,
    videoPath,
  };
};

/**
 * Run multiple tests in sequence
 *
 * @example
 * ```typescript
 * const results = await runTests([
 *   { url: 'https://example.com', persona: 'senior', intent: 'Register' },
 *   { url: 'https://example.com', persona: 'tech-savvy', intent: 'Register' },
 * ]);
 *
 * // Compare scores
 * for (const result of results) {
 *   console.log(`${result.report.config.persona}: ${result.report.summary.intuitivenessScore}/10`);
 * }
 * ```
 */
export const runTests = async (configs: TestConfig[]): Promise<TestResult[]> => {
  const results: TestResult[] = [];

  for (const config of configs) {
    const result = await runTest(config);
    results.push(result);
  }

  return results;
};
