import type { Expectation, ActionDecision, SessionContext } from '../../core/types.js';

export const createEvaluationPrompt = (
  persona: string,
  expectation: Expectation,
  action: ActionDecision,
  context: SessionContext
): string => {
  const intentSection = context.intent
    ? `Your goal: ${context.intent}`
    : 'You have no specific goal - just exploring.';

  return `You are simulating a user with this profile:
${persona}

${intentSection}

Before the action, you expected:
${expectation.what}
(Expected time: ${expectation.expectedTime || 'not specified'})

Action you took:
${action.action}${action.elementId ? ` on element ${action.elementId}` : ''}
Reasoning: ${action.reasoning}

Now you're looking at the result. Compare what happened with what you expected.

Evaluate honestly as this user would:
- Was the expectation met?
- Were you surprised (positively or negatively)?
- Was anything confusing?
- What would you suggest to improve the experience?

Respond in the same language as the persona description.

Respond with a JSON object:
{
  "result": "met" | "unmet" | "partial" | "surprised",
  "reality": "What actually happened - describe what you see now",
  "notes": ["List of observations about the UX"],
  "suggestions": ["List of improvement suggestions"],
  "userQuote": "A quote from the user's perspective, e.g., 'As a user, I expected...'"
}`;
};
