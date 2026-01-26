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
  const goal = context.intent || 'exploring';
  const pageInfo = context.pageContext ? `Page: ${context.pageContext}\n` : '';
  const progress = context.currentSummary ? `Progress: ${context.currentSummary}\n` : '';

  return `You are: ${persona}
Goal: ${goal}
${pageInfo}${progress}You see: ${analysis.description}
Expectation: ${expectation.what}

Available elements:
${formatSnapshotForLLM(snapshot)}

Choose ONE action:
- click: click an element (elementId required)
- type: type text into a field (elementId + value required, value = THE ACTUAL TEXT you want to type, e.g. "hello world")
- scroll: scroll the page
- wait: wait for something
- read: read content on page
- navigate: go to a different URL (value = the URL)

IMPORTANT:
- For "type" action: "value" must be the actual text you want to type (e.g. "Aleluja"), NOT the element ID!
- DO NOT repeat actions that already failed! If you already searched for something and it didn't work, try a DIFFERENT approach (different search terms, click on navigation, explore menus, etc.)
- If stuck, try clicking on navigation, menu items, or browsing content instead of repeating failed searches.

Respond in JSON:
{"action":"type","elementId":"tex-1","value":"actual text to type here","reasoning":"why this is different from what was tried before"}`;
};
