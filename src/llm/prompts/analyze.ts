import type { SessionContext } from '../../core/types.js';
import type { SnapshotElement } from '../../vision/types.js';
import { formatSnapshotForLLM } from '../../vision/index.js';

export const createAnalyzePrompt = (
  persona: string,
  context: SessionContext,
  snapshot: SnapshotElement[]
): string => {
  const contextSection = context.currentSummary
    ? `\n\nWhat happened so far:\n${context.currentSummary}`
    : '\n\nThis is the first step - you just arrived at the page.';

  const intentSection = context.intent
    ? `\n\nYour goal: ${context.intent}`
    : '\n\nYou have no specific goal - just exploring the application.';

  return `You are simulating a user with this profile:
${persona}
${intentSection}
${contextSection}

You are looking at a webpage. Describe what you see from this user's perspective.

Focus on:
- What stands out immediately
- Main navigation and content areas
- Calls to action
- Anything confusing or unclear

Available interactive elements on the page:
${formatSnapshotForLLM(snapshot)}

Respond in the same language as the persona description.

Respond with a JSON object:
{
  "description": "Brief description of what you see",
  "mainElements": ["List", "of", "main", "things", "you", "notice"],
  "observations": ["Any observations about the UI/UX from user perspective"]
}`;
};
