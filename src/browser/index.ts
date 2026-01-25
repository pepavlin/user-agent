import { chromium, type Browser, type Page } from 'playwright';
import type { BrowserManager } from './types.js';
import type { ActionDecision } from '../core/types.js';
import { executeAction } from './actions.js';

export const createBrowserManager = (): BrowserManager => {
  let browser: Browser | null = null;
  let page: Page | null = null;

  // Map of element IDs to selectors (populated from accessibility snapshot)
  let elementMap: Map<string, string> = new Map();

  return {
    async launch() {
      browser = await chromium.launch({
        headless: true,
      });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      page = await context.newPage();
    },

    async navigate(url: string) {
      if (!page) {
        throw new Error('Browser not launched');
      }
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    },

    async executeAction(action: ActionDecision) {
      if (!page) {
        throw new Error('Browser not launched');
      }

      let selector: string | undefined;

      if (action.elementId) {
        selector = elementMap.get(action.elementId);
        if (!selector && action.action !== 'wait' && action.action !== 'read') {
          // Try to find element by accessible name as fallback
          selector = `[data-element-id="${action.elementId}"]`;
        }
      }

      return executeAction(page, action, selector);
    },

    getPage() {
      return page;
    },

    async close() {
      if (browser) {
        await browser.close();
        browser = null;
        page = null;
      }
    },
  };
};

export type { BrowserManager, ActionResult, Page } from './types.js';
