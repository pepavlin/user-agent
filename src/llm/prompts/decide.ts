import type { ScreenAnalysis, Expectation, SessionContext } from '../../core/types.js';
import type { SnapshotElement } from '../../vision/types.js';
import { formatSnapshotForLLM } from '../../vision/index.js';

export const createDecisionPrompt = (
  persona: string,
  analysis: ScreenAnalysis,
  expectation: Expectation,
  snapshot: SnapshotElement[],
  context: SessionContext
): string => {
  const intentSection = context.intent
    ? `Your goal: ${context.intent}`
    : 'You have no specific goal - just exploring.';

  return `You are simulating a user with this profile:
${persona}

${intentSection}

Current situation:
${analysis.description}

Your expectation:
${expectation.what}

Available interactive elements:
${formatSnapshotForLLM(snapshot)}

Decide what action to take. Choose the element by its ID from the list above.

Available actions:
- click: Click on an element (requires elementId)
- type: Type text into a field (requires elementId and value)
- scroll: Scroll the page or to an element (optional elementId)
- wait: Wait and observe (optional value in milliseconds)
- read: Just read/observe content without interaction
- navigate: Go to a URL (requires value with URL)

Think like a real user - not a tester. Choose what feels natural.

Respond in the same language as the persona description.

Respond with a JSON object:
{
  "action": "click" | "type" | "scroll" | "wait" | "read" | "navigate",
  "elementId": "ID from the list above (e.g., 'btn-1', 'tex-3')",
  "value": "For type: text to enter. For navigate: URL. For wait: milliseconds",
  "reasoning": "Why you chose this action - from the user's perspective"
}`;
};
