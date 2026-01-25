import type { Page } from 'playwright';
import type { VisionProvider, VisionResult, SnapshotElement } from './types.js';
import { captureScreenshot } from './screenshot.js';
import { captureAccessibilitySnapshot, formatSnapshotForLLM } from './snapshot.js';

export const createVisionProvider = (page: Page): VisionProvider => {
  let lastSnapshot: SnapshotElement[] = [];

  return {
    async capture(): Promise<VisionResult> {
      const [screenshot, snapshot] = await Promise.all([
        captureScreenshot(page),
        captureAccessibilitySnapshot(page),
      ]);

      lastSnapshot = snapshot;

      return {
        screenshot,
        snapshot,
        timestamp: Date.now(),
      };
    },

    async findElementById(id: string): Promise<SnapshotElement | null> {
      return lastSnapshot.find((el) => el.id === id) ?? null;
    },
  };
};

export { formatSnapshotForLLM } from './snapshot.js';
export type { VisionProvider, VisionResult, SnapshotElement } from './types.js';
