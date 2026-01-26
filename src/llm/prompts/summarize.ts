import type { ActionDecision, Evaluation } from '../../core/types.js';

export const createSummarizePrompt = (
  _persona: string,
  previousSummary: string,
  action: ActionDecision,
  evaluation: Evaluation
): string => {
  const prev = previousSummary || 'Started session';

  // Include what was typed if it was a type action
  const actionDetails = action.action === 'type' && action.value
    ? `typed "${action.value}"`
    : action.action;

  return `Previous: ${prev}
Action: ${actionDetails} - ${evaluation.result}
Result: ${evaluation.reality}

Summarize progress in 1-2 sentences. Include:
1. What was attempted and the outcome
2. If action failed, note what didn't work (so we don't repeat it)
Just text, no JSON.`;
};
