import type { SnapshotElement } from '../../vision/types.js';
import { formatSnapshotForLLM } from '../../vision/index.js';

export const createPageContextPrompt = (
  snapshot: SnapshotElement[]
): string => {
  return `Analyze this webpage and describe what kind of website/application this is.

Page elements:
${formatSnapshotForLLM(snapshot)}

Provide a brief 1-2 sentence description of what this website is about and what it's used for.
This will be used as context for the rest of the session.

Respond with just the description text, no JSON.`;
};
