import type { ScreenAnalysis, SessionContext } from '../../core/types.js';

export const createExpectationPrompt = (
  persona: string,
  analysis: ScreenAnalysis,
  context: SessionContext
): string => {
  const intentSection = context.intent
    ? `Your goal: ${context.intent}`
    : 'You have no specific goal - just exploring curiously.';

  return `You are simulating a user with this profile:
${persona}

${intentSection}

You just looked at the page and observed:
${analysis.description}

Main elements you noticed:
${analysis.mainElements.map((el) => `- ${el}`).join('\n')}

Now formulate what you EXPECT to happen next or what you're looking for.
Think like a real user - what would they hope to find or do?

Consider:
- What would be intuitive to do next?
- What do you expect to see if you interact with something?
- How long do you expect actions to take?

Respond in the same language as the persona description.

Respond with a JSON object:
{
  "what": "What you expect (e.g., 'I expect clicking the search button will show a search field')",
  "expectedTime": "How long you expect this to take (e.g., 'instant', '1-2 seconds', 'might take a while')",
  "confidence": "high" | "medium" | "low"
}`;
};
