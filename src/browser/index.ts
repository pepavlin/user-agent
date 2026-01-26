import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import type { BrowserManager, BrowserLaunchOptions } from './types.js';
import type { ActionDecision } from '../core/types.js';
import type { SnapshotElement } from '../vision/types.js';
import { executeAction } from './actions.js';
import { mkdir } from 'fs/promises';

export const createBrowserManager = (): BrowserManager => {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let videoPath: string | null = null;

  // Store snapshot elements for finding by ID
  let currentSnapshot: SnapshotElement[] = [];

  return {
    async launch(options?: BrowserLaunchOptions) {
      browser = await chromium.launch({
        headless: true,
      });

      // Setup context options
      const contextOptions: Parameters<Browser['newContext']>[0] = {
        viewport: { width: 1280, height: 720 },
      };

      // Enable video recording in ultra debug mode
      if (options?.debug === 'ultra') {
        const videoDir = options.videoDir || './tmp/videos';
        await mkdir(videoDir, { recursive: true });
        contextOptions.recordVideo = {
          dir: videoDir,
          size: { width: 1280, height: 720 },
        };
      }

      context = await browser.newContext(contextOptions);
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

    getVideoPath() {
      return videoPath;
    },

    async close() {
      // Get video path before closing
      if (page) {
        const video = page.video();
        if (video) {
          videoPath = await video.path();
        }
      }

      if (context) {
        await context.close();
        context = null;
      }

      if (browser) {
        await browser.close();
        browser = null;
        page = null;
      }
    },
  };
};

export type { BrowserManager, ActionResult, Page } from './types.js';
