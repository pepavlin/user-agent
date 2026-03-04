# Browser Module

The browser module (`/src/browser/`) wraps Playwright and provides browser lifecycle management and action execution.

## BrowserManager Interface

```typescript
type BrowserManager = {
  launch(options?: BrowserLaunchOptions): Promise<void>;
  navigate(url: string): Promise<void>;
  setSnapshot(snapshot: SnapshotElement[]): void;
  executeAction(action: ActionDecision): Promise<ActionResult>;
  getPage(): Page | null;
  getVideoPath(): string | null;
  close(): Promise<void>;
};

type BrowserLaunchOptions = {
  debug?: DebugLevel;
  videoDir?: string;
};

type ActionResult = {
  success: boolean;
  error?: string;
  duration: number;
};
```

Created with `createBrowserManager()`.

## Browser Configuration

- **Engine:** Chromium (headless)
- **Viewport:** 1280×720
- **Navigation:** `waitUntil: 'domcontentloaded'`
- **Video recording:** Enabled in `ultra` debug mode, saved to `./tmp/videos/`

## Snapshot Management

Before executing an action, the session calls `browser.setSnapshot(snapshot)` to store the current ARIA snapshot elements. The browser manager uses this snapshot internally to resolve element IDs to Playwright locators.

## Actions

| Action | Description | Details |
|--------|-------------|---------|
| `click` | Click an element | By element ID or coordinates `{ x, y }` |
| `type` | Type into a single input | Uses `locator.fill(value)`, timeout 10,000 ms |
| `fill` | Fill multiple form fields | Iterates `action.inputs[]`, fills each element |
| `scroll` | Scroll the page | `scrollIntoViewIfNeeded()` if element given, else `window.scrollBy(0, 300)` |
| `wait` | Wait for a duration | `page.waitForTimeout(ms)`, default 1,000 ms |
| `navigate` | Go to a URL | `page.goto(url)` |
| `read` | Passive observation | No-op; signals AI wants to read without interacting |

### Click: Element-Based vs Coordinate-Based

**Element-based** (primary): The AI returns an `elementId` from the ARIA snapshot. The browser resolves it using:
1. `page.getByRole(role).nth(nthIndex)` (preferred)
2. `page.getByText(name).nth(nthIndex)` (fallback)

**Coordinate-based**: For visual elements not in the ARIA snapshot, the AI can return `coordinates: { x, y }`. The browser uses `page.mouse.click(x, y)`.

### Fill Action

For multi-field forms, the AI returns an `inputs` array:

```typescript
type InputFill = { elementId: string; value: string };
```

Each input is resolved and filled sequentially.

## Video Recording

When `debug` is set to `'ultra'`, the browser launches with video recording enabled. Videos are saved to `./tmp/videos/` and the path is included in the session report.
