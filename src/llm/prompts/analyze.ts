import type { SessionContext } from '../../core/types.js';
import type { SnapshotElement } from '../../vision/types.js';
import { formatSnapshotForLLM } from '../../vision/index.js';

export const createAnalyzePrompt = (
  persona: string,
  context: SessionContext,
  snapshot: SnapshotElement[]
): string => {
  const pageContext = context.pageContext
    ? `This is: ${context.pageContext}`
    : '';

  const progressPart = context.currentSummary
    ? `Progress: ${context.currentSummary}`
    : 'First visit.';

  const goalPart = context.intent || 'Exploring freely.';

  // Keep prompt short and focused - don't rediscover what page is, use provided context
  return `You are: ${persona}
Goal: ${goalPart}
${pageContext}
${progressPart}

Page elements:
${formatSnapshotForLLM(snapshot)}

As this specific person, describe what you see on screen NOW. Consider:
- What would catch THIS persona's attention first?
- What might be confusing or unclear for someone with their background?
- What's relevant to their goal?

Respond in JSON (use the persona's language - Czech if they're Czech):
{"description":"what you see now from this persona's perspective","mainElements":["key elements you notice"],"observations":["UX observations relevant to this user type"]}`;
};
