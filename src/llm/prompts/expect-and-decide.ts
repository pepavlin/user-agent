import type { ScreenAnalysis, SessionContext } from '../../core/types.js';
import type { SnapshotElement } from '../../vision/types.js';
import { formatSnapshotForLLM } from '../../vision/index.js';

export const createExpectAndDecidePrompt = (
  persona: string,
  analysis: ScreenAnalysis,
  snapshot: SnapshotElement[],
  context: SessionContext
): string => {
  const goal = context.intent || 'exploring';
  const pageInfo = context.pageContext ? `Page: ${context.pageContext}\n` : '';
  const progress = context.currentSummary ? `Progress: ${context.currentSummary}\n` : '';

  return `You are: ${persona}
Goal: ${goal}
${pageInfo}${progress}You see: ${analysis.description}

Available elements:
${formatSnapshotForLLM(snapshot)}

Do TWO things:

1. EXPECTATION: As this persona, what do you expect will happen when you interact with what you see? Consider what would realistically happen, what might confuse this user, etc.

2. DECISION: Choose ONE action to perform:
- click: click an element by ID (elementId) OR by position on screen (coordinates: {x, y})
  - Use elementId for elements from the list above (more reliable)
  - Use coordinates {x, y} for anything else you see on screen (cards, images, visual elements not in the list)
- type: type text into a SINGLE field (elementId + value required)
- fill: fill MULTIPLE form fields at once (use for login forms, registration, etc.)
- scroll: scroll the page
- wait: wait for something
- hover: move mouse over an element to reveal tooltips, dropdowns, or hover states (elementId or coordinates required)
- navigate: go to a different URL (value = the URL)

IMPORTANT for fill action:
- Use "fill" when you see a FORM with multiple inputs (login, registration, search filters, etc.)
- Fill ALL relevant fields in one action, then click submit in the next step

Respond in JSON:
{
  "expectation": {
    "what": "what you expect to happen (in persona's language)",
    "expectedTime": "instant/1-2s/slow",
    "confidence": "high/medium/low"
  },
  "decision": {
    "action": "click|type|fill|scroll|wait|hover|navigate",
    "elementId": "element ID if needed",
    "coordinates": {"x": 640, "y": 360},
    "value": "text value if needed for type action",
    "inputs": [{"elementId": "...", "value": "..."}],
    "reasoning": "why this action"
  }
}

Note: Include "inputs" array only for "fill" action, "elementId"+"value" only for "type" action.
For click: use "elementId" for interactive elements from the list, OR "coordinates" for visual elements not in the list. Do not provide both.`;
};
