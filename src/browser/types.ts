import type { ActionDecision } from '../core/types.js';
import type { SnapshotElement } from '../vision/types.js';

// Result of browser action execution
export type ActionResult = {
  success: boolean;
  error?: string;
  duration: number;
};

// Browser manager type
export type BrowserManager = {
  launch(): Promise<void>;
  navigate(url: string): Promise<void>;
  setSnapshot(snapshot: SnapshotElement[]): void;
  executeAction(action: ActionDecision): Promise<ActionResult>;
  getPage(): Page | null;
  close(): Promise<void>;
};

// Re-export Playwright Page type for convenience
import type { Page } from 'playwright';
export type { Page };
