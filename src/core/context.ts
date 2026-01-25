import type { SessionContext, StepResult } from './types.js';

export const createInitialContext = (intent?: string, pageContext?: string): SessionContext => {
  return {
    intent,
    pageContext,
    currentSummary: '',
    stepCount: 0,
    issuesFound: [],
  };
};

export const updateContext = (
  context: SessionContext,
  stepResult: StepResult,
  newSummary: string
): SessionContext => {
  // Collect issues from evaluation notes
  const newIssues = stepResult.evaluation.notes.filter(
    (note) =>
      note.toLowerCase().includes('confus') ||
      note.toLowerCase().includes('unclear') ||
      note.toLowerCase().includes('difficult') ||
      note.toLowerCase().includes('hidden') ||
      note.toLowerCase().includes('missing') ||
      note.toLowerCase().includes('frustrat')
  );

  return {
    ...context,
    currentSummary: newSummary,
    lastStepResult: stepResult,
    stepCount: context.stepCount + 1,
    issuesFound: [...context.issuesFound, ...newIssues],
  };
};
