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

  // 3. Formulate expectation
  logger.step(stepNumber, 'Formulating expectation...');
  const expectationResponse = await llm.formulateExpectation({
    analysis: analysisResponse.data,
    persona: config.persona,
    context,
  });
  costTracker.addUsage(expectationResponse.usage.inputTokens, expectationResponse.usage.outputTokens);
  await logger.saveLLMResponse(stepNumber, 'expect', expectationResponse);

  logger.debug(`Expectation: ${expectationResponse.data.what}`);

  // 4. Decide action
  logger.step(stepNumber, 'Deciding action...');
  const decisionResponse = await llm.decideAction({
    analysis: analysisResponse.data,
    expectation: expectationResponse.data,
    snapshot: beforeCapture.snapshot,
    persona: config.persona,
    context,
  });
  costTracker.addUsage(decisionResponse.usage.inputTokens, decisionResponse.usage.outputTokens);
  await logger.saveLLMResponse(stepNumber, 'decide', decisionResponse);

  // Log the action
  if (decisionResponse.data.action === 'fill' && decisionResponse.data.inputs) {
    const inputIds = decisionResponse.data.inputs.map(i => i.elementId).join(', ');
    logger.step(stepNumber, `Action: fill ${decisionResponse.data.inputs.length} fields [${inputIds}]`);
  } else {
    logger.step(
      stepNumber,
      `Action: ${decisionResponse.data.action}${decisionResponse.data.elementId ? ` on [${decisionResponse.data.elementId}]` : ''}`
    );
  }

  // 5. Execute action
  logger.step(stepNumber, 'Executing action...');
  browser.setSnapshot(beforeCapture.snapshot);
  const actionResult = await browser.executeAction(decisionResponse.data);

  if (!actionResult.success) {
    logger.error(`Action failed: ${actionResult.error}`);
  }

  // 6. Wait for page to settle
  logger.step(stepNumber, `Waiting ${config.waitBetweenActions}s for page to settle...`);
  await new Promise((resolve) => setTimeout(resolve, config.waitBetweenActions * 1000));

  // 7. Capture result state
  const afterCapture = await vision.capture();
  await logger.saveScreenshot(stepNumber, 'after', afterCapture.screenshot);

  // 8. Evaluate result
  logger.step(stepNumber, 'Evaluating result...');
  const evaluationResponse = await llm.evaluateResult({
    expectation: expectationResponse.data,
    action: decisionResponse.data,
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
    expectation: expectationResponse.data,
    action: decisionResponse.data,
    evaluation: evaluationResponse.data,
  };
};
