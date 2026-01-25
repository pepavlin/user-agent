import type { ActionDecision, Evaluation } from '../../core/types.js';

export const createSummarizePrompt = (
  persona: string,
  previousSummary: string,
  action: ActionDecision,
  evaluation: Evaluation
): string => {
  const previousSection = previousSummary
    ? `Previous progress:\n${previousSummary}`
    : 'This was the first step.';

  return `You are maintaining context for a user simulation.

User profile:
${persona}

${previousSection}

Latest action:
- Action: ${action.action}${action.elementId ? ` on ${action.elementId}` : ''}
- Reasoning: ${action.reasoning}
- Result: ${evaluation.result}
- What happened: ${evaluation.reality}

Create a brief summary (2-3 sentences) of the overall progress so far.
Include: where the user is now, what they've tried, any issues encountered.

This summary will be used as context for the next step.

Respond in the same language as the persona description.

Respond with just the summary text, no JSON.`;
};
