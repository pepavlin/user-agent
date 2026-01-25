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

  return `You are: ${persona}
Goal: ${goal}
${pageInfo}You see: ${analysis.description}
Expectation: ${expectation.what}

Available elements:
${formatSnapshotForLLM(snapshot)}

Choose ONE action:
- click: click an element (elementId required)
- type: type text into a field (elementId + value required, value = THE ACTUAL TEXT you want to type, e.g. "hello world")
- scroll: scroll the page
- wait: wait for something
- read: read content on page

IMPORTANT for "type" action: "value" must be the actual text you want to type (e.g. "Aleluja"), NOT the element ID!

Respond in JSON:
{"action":"type","elementId":"tex-1","value":"actual text to type here","reasoning":"why"}`;
};
