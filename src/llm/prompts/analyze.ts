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

Describe briefly what you see on screen NOW (current state, not what page is about). Respond in JSON:
{"description":"what you see now","mainElements":["element1","element2"],"observations":["observation1"]}`;
};
