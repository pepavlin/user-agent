import type { ActionDecision, Evaluation } from '../../core/types.js';

export const createSummarizePrompt = (
  _persona: string,
  previousSummary: string,
  action: ActionDecision,
  evaluation: Evaluation
): string => {
  const prev = previousSummary || 'Started session';

  return `Previous: ${prev}
Action: ${action.action} - ${evaluation.result}
Result: ${evaluation.reality}

Summarize progress in 1-2 sentences. Just text, no JSON.`;
};
