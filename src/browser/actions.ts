import type { Page } from 'playwright';
import type { ActionDecision } from '../core/types.js';
import type { ActionResult } from './types.js';

export const executeAction = async (
  page: Page,
  action: ActionDecision,
  elementSelector?: string
): Promise<ActionResult> => {
  const startTime = Date.now();

  try {
    switch (action.action) {
      case 'click': {
        if (!elementSelector) {
          throw new Error('Element selector required for click action');
        }
        await page.locator(elementSelector).click();
        break;
      }

      case 'type': {
        if (!elementSelector) {
          throw new Error('Element selector required for type action');
        }
        if (!action.value) {
          throw new Error('Value required for type action');
        }
        await page.locator(elementSelector).fill(action.value);
        break;
      }

      case 'scroll': {
        if (elementSelector) {
          await page.locator(elementSelector).scrollIntoViewIfNeeded();
        } else {
          await page.evaluate('window.scrollBy(0, 300)');
        }
        break;
      }

      case 'wait': {
        const waitTime = action.value ? parseInt(action.value, 10) : 1000;
        await page.waitForTimeout(waitTime);
        break;
      }

      case 'navigate': {
        if (!action.value) {
          throw new Error('URL required for navigate action');
        }
        await page.goto(action.value);
        break;
      }

      case 'read': {
        // Read action is passive - just for AI to analyze content
        // No browser action needed
        break;
      }

      default: {
        throw new Error(`Unknown action type: ${action.action}`);
      }
    }

    return {
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
};
