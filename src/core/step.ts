import type { Page } from 'playwright';
import type { SessionConfig, SessionContext, StepResult } from './types.js';
import type { LLMProvider } from '../llm/types.js';
import type { VisionProvider } from '../vision/types.js';
import type { BrowserManager } from '../browser/types.js';
import type { Logger, CostTracker } from '../utils/types.js';

export type StepDependencies = {
  llm: LLMProvider;
  vision: VisionProvider;
  browser: BrowserManager;
  logger: Logger;
  costTracker: CostTracker;
};

export const executeStep = async (
  stepNumber: number,
  config: SessionConfig,
  context: SessionContext,
  deps: StepDependencies
): Promise<StepResult> => {
  const { llm, vision, browser, logger, costTracker } = deps;

  logger.step(stepNumber, 'Capturing page state...');

  // 1. Capture current state
  const beforeCapture = await vision.capture();

  logger.step(stepNumber, `Found ${beforeCapture.snapshot.length} interactive elements`);
  await logger.saveScreenshot(stepNumber, 'before', beforeCapture.screenshot);

  // 2. Analyze screen
  logger.step(stepNumber, 'Analyzing screen...');
  const analysisResponse = await llm.analyzeScreen({
    screenshot: beforeCapture.screenshot,
    snapshot: beforeCapture.snapshot,
    persona: config.persona,
    context,
  });
  costTracker.addUsage(analysisResponse.usage.inputTokens, analysisResponse.usage.outputTokens);
  await logger.saveLLMResponse(stepNumber, 'analyze', analysisResponse);

  logger.debug(`Analysis: ${analysisResponse.data.description}`);

  // 3. Formulate expectation + Decide action (combined for speed)
  logger.step(stepNumber, 'Deciding action...');
  const expectAndDecideResponse = await llm.expectAndDecide({
    analysis: analysisResponse.data,
    snapshot: beforeCapture.snapshot,
    persona: config.persona,
    context,
  });
  costTracker.addUsage(expectAndDecideResponse.usage.inputTokens, expectAndDecideResponse.usage.outputTokens);
  await logger.saveLLMResponse(stepNumber, 'expect-and-decide', expectAndDecideResponse);

  const expectationData = expectAndDecideResponse.data.expectation;
  const decisionData = expectAndDecideResponse.data.decision;

  logger.debug(`Expectation: ${expectationData.what}`);

  // Log the action
  if (decisionData.action === 'fill' && decisionData.inputs) {
    const inputIds = decisionData.inputs.map(i => i.elementId).join(', ');
    logger.step(stepNumber, `Action: fill ${decisionData.inputs.length} fields [${inputIds}]`);
  } else {
    logger.step(
      stepNumber,
      `Action: ${decisionData.action}${decisionData.elementId ? ` on [${decisionData.elementId}]` : ''}`
    );
  }

  // 4. Execute action
  logger.step(stepNumber, 'Executing action...');
  browser.setSnapshot(beforeCapture.snapshot);
  const actionResult = await browser.executeAction(decisionData);

  if (!actionResult.success) {
    logger.error(`Action failed: ${actionResult.error}`);
  }

  // 5. Wait for page to settle
  logger.step(stepNumber, `Waiting ${config.waitBetweenActions}s for page to settle...`);
  await new Promise((resolve) => setTimeout(resolve, config.waitBetweenActions * 1000));

  // 6. Capture result state
  const afterCapture = await vision.capture();
  await logger.saveScreenshot(stepNumber, 'after', afterCapture.screenshot);

  // 7. Evaluate result
  logger.step(stepNumber, 'Evaluating result...');
  const evaluationResponse = await llm.evaluateResult({
    expectation: expectationData,
    action: decisionData,
    beforeScreenshot: beforeCapture.screenshot,
    afterScreenshot: afterCapture.screenshot,
    persona: config.persona,
    context,
  });
  costTracker.addUsage(evaluationResponse.usage.inputTokens, evaluationResponse.usage.outputTokens);
  await logger.saveLLMResponse(stepNumber, 'evaluate', evaluationResponse);

  logger.step(stepNumber, `Result: ${evaluationResponse.data.result.toUpperCase()}`);

  return {
    stepNumber,
    timestamp: beforeCapture.timestamp,
    screenshot: beforeCapture.screenshot,
    analysis: analysisResponse.data,
    expectation: expectationData,
    action: decisionData,
    evaluation: evaluationResponse.data,
  };
};
