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

// Keywords that indicate UX issues (English and Czech)
const issueKeywords = [
  // English
  'confus', 'unclear', 'difficult', 'hidden', 'missing', 'frustrat',
  'broken', 'inconsistent', 'unusable', 'poor', 'bad', 'problem',
  'error', 'fail', 'wrong', 'bug', 'issue', 'doesn\'t work', 'not work',
  'hard to', 'cannot', 'can\'t', 'impossible', 'unintuitive',
  // Czech
  'nekonzistent', 'chybí', 'problém', 'špatně', 'špatná', 'špatný',
  'nefunguje', 'nereaguje', 'matoucí', 'nejasn', 'nelogick', 'obtížn',
  'komplikovan', 'zmatek', 'nepoužiteln', 'nepřehled',
];

export const updateContext = (
  context: SessionContext,
  stepResult: StepResult,
  newSummary: string
): SessionContext => {
  // Collect issues from evaluation notes
  const newIssues = stepResult.evaluation.notes.filter((note) => {
    const lower = note.toLowerCase();
    return issueKeywords.some((keyword) => lower.includes(keyword));
  });

  return {
    ...context,
    currentSummary: newSummary,
    lastStepResult: stepResult,
    stepCount: context.stepCount + 1,
    issuesFound: [...context.issuesFound, ...newIssues],
  };
};
