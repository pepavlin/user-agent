import type { ScreenAnalysis, SessionContext } from '../../core/types.js';

export const createExpectationPrompt = (
  persona: string,
  analysis: ScreenAnalysis,
  context: SessionContext
): string => {
  const goal = context.intent || 'exploring';
  const pageInfo = context.pageContext ? `This is: ${context.pageContext}\n` : '';
  const progress = context.currentSummary ? `Progress: ${context.currentSummary}\n` : '';

  return `You are: ${persona}
Goal: ${goal}
${pageInfo}${progress}You see: ${analysis.description}

As this specific person (consider age, tech skills, experience), what do you expect to happen when you interact with what you see? Think about:
- What would this persona realistically expect?
- What might confuse or delight this specific user?
- What assumptions would they make based on their background?

Respond in JSON (write expectation in the persona's native language if they're Czech):
{"what":"your expectation as this persona","expectedTime":"instant/1-2s/slow","confidence":"high/medium/low"}`;
};
