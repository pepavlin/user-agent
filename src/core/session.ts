import type { SessionConfig, SessionReport, SessionSummary, StepResult } from './types.js';
import type { LLMProvider } from '../llm/types.js';
import type { BrowserManager } from '../browser/types.js';
import type { Logger, CostTracker } from '../utils/types.js';
import type { ReportGenerator } from '../report/types.js';
import { createVisionProvider } from '../vision/index.js';
import { saveJsonReport } from '../report/index.js';
import { createInitialContext, updateContext } from './context.js';
import { executeStep } from './step.js';

export type SessionDependencies = {
  llm: LLMProvider;
  browser: BrowserManager;
  logger: Logger;
  costTracker: CostTracker;
  reportGenerator: ReportGenerator;
};

export const calculateIntuitivenessScore = (steps: StepResult[]): number => {
  if (steps.length === 0) return 5;

  let score = 10;

  steps.forEach((step) => {
    switch (step.evaluation.result) {
      case 'met':
        // No penalty
        break;
      case 'partial':
        score -= 1;
        break;
      case 'unmet':
        score -= 2;
        break;
      case 'surprised':
        score -= 1.5;
        break;
    }
  });

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
};

export const generateSummary = (steps: StepResult[], context: { issuesFound: string[] }): SessionSummary => {
  const improvements: string[] = [];
  const userQuotes: string[] = [];

  steps.forEach((step) => {
    improvements.push(...step.evaluation.suggestions);
    if (step.evaluation.userQuote) {
      userQuotes.push(step.evaluation.userQuote);
    }
  });

  // Deduplicate
  const uniqueImprovements = [...new Set(improvements)];
  const uniqueQuotes = [...new Set(userQuotes)];
  const uniqueIssues = [...new Set(context.issuesFound)];

  return {
    totalSteps: steps.length,
    intuitivenessScore: calculateIntuitivenessScore(steps),
    issuesFound: uniqueIssues,
    improvements: uniqueImprovements,
    userQuotes: uniqueQuotes,
  };
};

export const runSession = async (
  config: SessionConfig,
  deps: SessionDependencies
): Promise<SessionReport> => {
  const { llm, browser, logger, costTracker, reportGenerator } = deps;
  const startTime = Date.now();
  const steps: StepResult[] = [];

  logger.info(`Starting session for ${config.url}`);
  logger.info(`Persona: ${config.persona}`);
  if (config.intent) {
    logger.info(`Intent: ${config.intent}`);
  } else {
    logger.info('Mode: Exploratory');
  }

  // Launch browser and navigate (with video in ultra debug mode)
  await browser.launch({
    debug: config.debug,
    videoDir: './tmp/videos',
  });
  logger.info('Browser launched');

  await browser.navigate(config.url);
  logger.info(`Navigated to ${config.url}`);

  // Create vision provider with the page
  const page = browser.getPage();
  if (!page) {
    throw new Error('Failed to get browser page');
  }
  const vision = createVisionProvider(page);

  // Get initial page context (what kind of website/app is this?)
  logger.info('Analyzing page context...');
  const initialCapture = await vision.capture();
  const pageContextResponse = await llm.getPageContext({
    screenshot: initialCapture.screenshot,
    snapshot: initialCapture.snapshot,
  });
  costTracker.addUsage(pageContextResponse.usage.inputTokens, pageContextResponse.usage.outputTokens);
  logger.info(`Page context: ${pageContextResponse.data}`);

  // Initialize context with page understanding
  let context = createInitialContext(config.intent, pageContextResponse.data);

  // Execute steps
  const sessionTimeout = config.timeout * 1000;
  const sessionStartTime = Date.now();

  for (let stepNumber = 1; stepNumber <= config.maxSteps; stepNumber++) {
    // Check timeout
    if (Date.now() - sessionStartTime > sessionTimeout) {
      logger.info('Session timeout reached');
      break;
    }

    // Check budget
    if (costTracker.isOverBudget()) {
      logger.info(`Budget limit reached (${costTracker.getTotalCostCZK().toFixed(2)} CZK)`);
      break;
    }

    logger.info(`\n--- Step ${stepNumber}/${config.maxSteps} ---`);

    try {
      const stepResult = await executeStep(stepNumber, config, context, {
        llm,
        vision,
        browser,
        logger,
        costTracker,
      });

      steps.push(stepResult);

      // Summarize context for next step
      if (stepNumber < config.maxSteps) {
        const summaryResponse = await llm.summarizeContext({
          previousSummary: context.currentSummary,
          latestStep: {
            action: stepResult.action,
            evaluation: stepResult.evaluation,
          },
          persona: config.persona,
        });
        costTracker.addUsage(summaryResponse.usage.inputTokens, summaryResponse.usage.outputTokens);

        context = updateContext(context, stepResult, summaryResponse.data);
      }
    } catch (error) {
      logger.error(`Step ${stepNumber} failed`, error instanceof Error ? error : undefined);
      // Continue to next step or break depending on error severity
      break;
    }
  }

  // Close browser
  await browser.close();
  const videoPath = browser.getVideoPath();
  if (videoPath) {
    logger.info(`Video saved to ${videoPath}`);
  }
  logger.info('Browser closed');

  const endTime = Date.now();

  // Pass video path to report generator
  if (videoPath) {
    reportGenerator.setVideoPath(videoPath);
  }

  // Generate report
  const report: SessionReport = {
    config,
    startTime,
    endTime,
    steps,
    summary: generateSummary(steps, context),
    cost: {
      inputTokens: costTracker.getInputTokens(),
      outputTokens: costTracker.getOutputTokens(),
      totalCostUSD: costTracker.getTotalCostUSD(),
      totalCostCZK: costTracker.getTotalCostCZK(),
    },
  };

  // Save report
  await reportGenerator.save(report, config.outputPath);
  logger.info(`Report saved to ${config.outputPath}`);

  // Save JSON report if path specified
  if (config.jsonOutputPath) {
    await saveJsonReport(report, config.jsonOutputPath, videoPath ?? undefined);
    logger.info(`JSON report saved to ${config.jsonOutputPath}`);
  }

  return report;
};
