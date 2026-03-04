import { withRetry } from './retry.js';
import { defaults } from '../config/defaults.js';

export type WebhookPayload = {
  sessionId: string;
  status: string;
  timestamp: number;
};

// Send a webhook notification. Never throws — failures are logged and swallowed
// so webhook issues cannot break a session.
export const sendWebhook = async (url: string, payload: WebhookPayload): Promise<void> => {
  try {
    await withRetry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(defaults.webhookTimeoutMs),
        });

        if (!response.ok) {
          throw new Error(`Webhook returned HTTP ${response.status}`);
        }
      },
      { attempts: 2, delayMs: 2000, backoff: false },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Webhook delivery failed for ${url}: ${message}`);
  }
};
