import type { ScreenAnalysis, SessionContext } from '../../core/types.js';

export const createExpectationPrompt = (
  persona: string,
  analysis: ScreenAnalysis,
  context: SessionContext
): string => {
  const goal = context.intent || 'exploring';

  return `You are: ${persona}
Goal: ${goal}
You see: ${analysis.description}

What do you expect to find or happen next? Respond in JSON:
{"what":"your expectation","expectedTime":"instant/1-2s/slow","confidence":"high/medium/low"}`;
};
