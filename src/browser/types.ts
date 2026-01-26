import type { ActionDecision } from '../core/types.js';
import type { SnapshotElement } from '../vision/types.js';
import type { DebugLevel } from '../utils/types.js';

// Result of browser action execution
export type ActionResult = {
  success: boolean;
  error?: string;
  duration: number;
};

// Browser launch options
export type BrowserLaunchOptions = {
  debug?: DebugLevel;
  videoDir?: string;
};

// Browser manager type
export type BrowserManager = {
  launch(options?: BrowserLaunchOptions): Promise<void>;
  navigate(url: string): Promise<void>;
  setSnapshot(snapshot: SnapshotElement[]): void;
  executeAction(action: ActionDecision): Promise<ActionResult>;
  getPage(): Page | null;
  getVideoPath(): string | null;
  close(): Promise<void>;
};

// Re-export Playwright Page type for convenience
import type { Page } from 'playwright';
export type { Page };
