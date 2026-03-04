# Vision Module

The vision module (`/src/vision/`) is **intentionally isolated** so it can be easily modified or replaced. It provides two complementary views of the page: a visual screenshot for AI perception and a structured ARIA snapshot for element interaction.

## Why Both Screenshot and Snapshot?

- **Screenshot** — The AI "sees" the page visually: colors, layout, positions, visual hierarchy. This drives the analysis and evaluation.
- **ARIA Snapshot** — Provides a structured list of interactive elements with unique IDs. This is how the AI specifies which element to interact with.

Neither alone is sufficient: screenshots lack element references, and ARIA snapshots lack visual context.

## VisionProvider Interface

```typescript
type VisionProvider = {
  capture(): Promise<VisionResult>;
  findElementById(id: string): Promise<SnapshotElement | null>;
};

type VisionResult = {
  screenshot: Buffer;
  snapshot: SnapshotElement[];
  timestamp: number;
};
```

The provider is created with `createVisionProvider(page)` — the Playwright `Page` is injected at creation time. The `capture()` method runs screenshot and snapshot capture in parallel.

The last snapshot is cached internally for `findElementById` lookups.

## Screenshot Capture

**File:** `screenshot.ts`

- Captures viewport-only PNG (not full-page)
- Viewport size: 1280×720 (set by browser manager)
- Returns raw `Buffer`

## ARIA Snapshot

**File:** `snapshot.ts`

Uses Playwright's `page.locator('body').ariaSnapshot()` to capture the accessibility tree.

### Element ID Generation

Each interactive element gets a unique ID built from a 3-character role prefix and a counter:

```
btn-1   (button)
lin-2   (link)
tex-3   (textbox)
chk-4   (checkbox)
cmb-5   (combobox)
```

### Interactive Roles

Only elements with these ARIA roles are captured:

`button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `listbox`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, `option`, `searchbox`, `slider`, `spinbutton`, `switch`, `tab`, `treeitem`

Elements at indent level 0–2 only (top-level elements; avoids duplicates from deeply nested structures).

### SnapshotElement Type

```typescript
type SnapshotElement = {
  id: string;
  role: string;
  name: string;
  description?: string;
  value?: string;
  disabled?: boolean;
  focused?: boolean;
  children?: SnapshotElement[];
  nthIndex?: number;    // For nth() selector disambiguation
};
```

The `nthIndex` field is used when multiple elements share the same role and name — it tracks which occurrence this element is for accurate Playwright selector resolution.

### LLM Format

The `formatSnapshotForLLM(elements)` function formats elements for inclusion in prompts:

```
[btn-1] button: "Submit"
[tex-2] textbox: "Search..." [disabled]
[lin-3] link: "Home"
```
