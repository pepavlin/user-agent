import type { Expectation, ActionDecision, SessionContext } from '../../core/types.js';

export const createEvaluationPrompt = (
  persona: string,
  expectation: Expectation,
  action: ActionDecision,
  context: SessionContext
): string => {
  // Build action description based on action type
  let actionDesc = `${action.action}`;
  if (action.action === 'type' && action.value) {
    actionDesc = `typed "${action.value}" into field`;
  } else if (action.action === 'click' && action.elementId) {
    actionDesc = `clicked on element`;
  } else if (action.elementId) {
    actionDesc = `${action.action} on element`;
  }

  const pageInfo = context.pageContext ? `On: ${context.pageContext}\n` : '';

  return `You are: ${persona}
${pageInfo}Expected: ${expectation.what}
Action taken: ${actionDesc}
Reasoning: ${action.reasoning}

Look at the screenshot and compare expectation vs reality. What happened after the action?

Respond in JSON:
{"result":"met/unmet/partial/surprised","reality":"describe what you see now","notes":["observation"],"suggestions":["improvement"],"userQuote":"As user I..."}`;
};
