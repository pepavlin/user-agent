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
- type: type text into a SINGLE field (elementId + value required)
- fill: fill MULTIPLE form fields at once (use for login forms, registration, etc.)
- scroll: scroll the page
- wait: wait for something
- read: read content on page
- navigate: go to a different URL (value = the URL)

IMPORTANT:
- Use "fill" when you see a FORM with multiple inputs (login, registration, search filters, etc.) - fill ALL relevant fields in one action, then click submit in the next step
- Use "type" only for a single standalone input (like a search box)
- DO NOT repeat actions that already failed! Try a DIFFERENT approach.

Response examples:

For single input (search):
{"action":"type","elementId":"tex-1","value":"search term","reasoning":"searching for X"}

For multiple inputs (login form):
{"action":"fill","inputs":[{"elementId":"tex-1","value":"user@email.com"},{"elementId":"tex-2","value":"password123"}],"reasoning":"filling login form with credentials"}

For click:
{"action":"click","elementId":"btn-1","reasoning":"clicking submit button"}`;
};
