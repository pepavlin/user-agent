import { chromium, type Browser, type Page } from 'playwright';
import type { BrowserManager } from './types.js';
import type { ActionDecision } from '../core/types.js';
import type { SnapshotElement } from '../vision/types.js';
import { executeAction } from './actions.js';

export const createBrowserManager = (): BrowserManager => {
  let browser: Browser | null = null;
  let page: Page | null = null;

  // Store snapshot elements for finding by ID
  let currentSnapshot: SnapshotElement[] = [];

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

    setSnapshot(snapshot: SnapshotElement[]) {
      currentSnapshot = snapshot;
    },

    async executeAction(action: ActionDecision) {
      if (!page) {
        throw new Error('Browser not launched');
      }

      // Find element info from snapshot
      const element = action.elementId
        ? currentSnapshot.find((el) => el.id === action.elementId)
        : undefined;

      return executeAction(page, action, element);
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
