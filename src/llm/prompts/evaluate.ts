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
  const progress = context.currentSummary ? `Progress: ${context.currentSummary}\n` : '';

  return `You are: ${persona}
${pageInfo}${progress}Expected: ${expectation.what}
Action taken: ${actionDesc}
Reasoning: ${action.reasoning}

Look at the screenshot and evaluate from THIS persona's perspective:
- Did the result match their expectation? (met/unmet/partial/surprised)
- What does this persona see now?
- What UX problems would THIS user notice (based on their age, tech skills, goals)?
- What specific improvements would help THIS type of user?

Respond in JSON (write in the persona's language - Czech for Czech personas):
{
  "result": "met/unmet/partial/surprised",
  "reality": "describe what happened from this persona's perspective",
  "notes": ["specific UX observations for this user type"],
  "suggestions": ["specific improvements that would help this persona"],
  "userQuote": "As [persona type] I... (a realistic quote expressing their feeling)"
}`;
};
