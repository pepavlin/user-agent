# UserAgent - Development Guide

## Project Overview

UserAgent is a UX research automation tool that simulates real human users interacting with web applications. Unlike traditional E2E testing, it focuses on **intuition, expectations, and user experience** rather than test assertions.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Browser Automation:** Playwright
- **AI/LLM:** Claude (primary), model-agnostic architecture
- **Output:** Markdown reports
- **Deployment:** Docker-ready

## Architecture

```
src/
├── cli/                 # CLI argument parsing and entry point
│   └── index.ts
├── core/
│   ├── session.ts       # Main session orchestrator
│   ├── step.ts          # Single step execution logic
│   ├── context.ts       # Context summarization between steps
│   └── types.ts         # Core type definitions
├── vision/              # Screen perception (isolated for easy swapping)
│   ├── index.ts
│   ├── screenshot.ts    # Screenshot capture
│   └── snapshot.ts      # Accessibility snapshot for element location
├── llm/                 # LLM integration (model-agnostic)
│   ├── types.ts         # LLMProvider type definition
│   ├── claude.ts        # Claude implementation
│   ├── openai.ts        # OpenAI implementation (future)
│   ├── index.ts         # Factory/provider selection
│   └── prompts/         # All LLM prompts in separate files
│       ├── analyze.ts   # Screen analysis prompt
│       ├── expect.ts    # Expectation formulation prompt
│       ├── decide.ts    # Action decision prompt
│       ├── evaluate.ts  # Result evaluation prompt
│       └── summarize.ts # Context summarization prompt
├── browser/             # Playwright browser management
│   ├── index.ts
│   └── actions.ts       # Click, type, scroll, navigate
├── report/              # Output generation
│   ├── markdown.ts      # Markdown report generator
│   └── types.ts         # Report data structures
├── utils/
│   ├── logger.ts        # Logging with debug modes
│   ├── cost.ts          # Token usage and cost tracking
│   └── retry.ts         # Retry utilities
└── config/
    └── defaults.ts      # Default configuration values
```

## Key Design Decisions

### Vision System (Isolated)

The vision system is intentionally separated so it can be easily modified:
- **Screenshot:** AI "sees" the page visually (colors, layout, positions)
- **Accessibility Snapshot:** Used to locate and interact with elements AI identifies

```typescript
// Vision module type definition
type VisionResult = {
  screenshot: Buffer;          // What AI sees
  snapshot: AccessibilityTree; // How to find elements
};
```

### LLM Provider (Model-Agnostic)

All LLM interactions go through a common interface:

```typescript
type LLMProvider = {
  analyzeScreen(screenshot: Buffer, persona: string, context: string): Promise<ScreenAnalysis>;
  formulateExpectation(analysis: ScreenAnalysis, intent?: string): Promise<Expectation>;
  decideAction(analysis: ScreenAnalysis, expectation: Expectation): Promise<ActionDecision>;
  evaluateResult(expectation: Expectation, newScreenshot: Buffer): Promise<Evaluation>;
};
```

### Persona Description

Personas are described in natural language text, not structured JSON:

```
"Jana, 45 years old. Never used Spotify but knows YouTube.
Not tech-savvy and found this page by accident."
```

The AI thinks and responds in the language of the persona description.

### Step Execution Flow

Each step follows this sequence:

1. **Capture** - Take screenshot + accessibility snapshot
2. **Analyze** - AI describes what it sees
3. **Expect** - AI formulates expectations ("I expect clicking this will...")
4. **Decide** - AI chooses an action (returns element ID from snapshot)
5. **Execute** - Perform action on element by ID
6. **Wait** - Fixed delay (default 10s) for page to react
7. **Evaluate** - AI compares reality vs expectation
8. **Summarize** - Update context summary for next step
9. **Document** - Record step results

### Element Matching (Snapshot with IDs)

The accessibility snapshot includes unique IDs for each interactive element:

```typescript
// Snapshot format passed to LLM
type SnapshotElement = {
  id: string;           // Unique identifier (e.g., "btn-1", "input-2")
  role: string;         // ARIA role (button, textbox, link, etc.)
  name: string;         // Accessible name
  description?: string; // Additional description
};

// LLM returns the ID of element to interact with
type ActionDecision = {
  elementId: string;    // Reference to snapshot element
  action: ActionType;
  value?: string;       // For type actions
  reasoning: string;
};
```

This approach is reliable because:
- No ambiguity - exact element reference
- No coordinate-based clicking (fragile)
- AI sees both visual (screenshot) and structural (snapshot) information

### Context Management (Summarization)

To avoid context explosion, we maintain a **rolling summary** instead of full history:

```typescript
type SessionContext = {
  intent: string;                    // Original user intent
  currentSummary: string;            // AI-generated summary of progress so far
  lastStepResult: StepResult;        // Only the most recent step in detail
  stepCount: number;
  issuesFound: string[];             // Accumulated UX issues
};
```

After each step, AI generates a brief summary like:
> "Navigated to homepage, found search bar, searched for 'relaxing music'.
> Currently viewing search results with 10 playlists shown."

### Prompt Engineering

All prompts are stored in `/src/llm/prompts/` as separate files:

```typescript
// /src/llm/prompts/analyze.ts
export const createAnalyzePrompt = (
  persona: string,
  context: SessionContext,
  snapshot: SnapshotElement[]
): string => `
You are simulating a user with this profile:
${persona}

Current context:
${context.currentSummary}

You see a webpage. Describe what you observe from the user's perspective.
Focus on: main elements, navigation options, calls to action.

Available interactive elements:
${formatSnapshot(snapshot)}

Respond in the same language as the persona description.
`;
```

**Prompt file responsibilities:**
- `analyze.ts` - Describe what's on screen
- `expect.ts` - Formulate expectations before action
- `decide.ts` - Choose action and target element ID
- `evaluate.ts` - Compare expectation vs reality
- `summarize.ts` - Generate context summary for next step

### Debug Modes

Three verbosity levels controlled by `--debug` flag:

```bash
# Normal mode (default)
user-agent --url "..."

# Debug mode - detailed console output
user-agent --url "..." --debug

# Ultra debug mode - saves everything to tmp/
user-agent --url "..." --debug ultra
```

| Mode | Console Output | File Output |
|------|----------------|-------------|
| Normal | Progress only | report.md |
| Debug | + Step details, decisions | + tmp/debug.log |
| Ultra | + Raw LLM responses | + tmp/llm-responses/*.json, tmp/screenshots/*.png |

**Ultra debug saves to `tmp/`:**
```
tmp/
├── debug.log                    # Full debug log
├── llm-responses/
│   ├── step-001-analyze.json    # Raw LLM request/response
│   ├── step-001-decide.json
│   └── ...
└── screenshots/
    ├── step-001-before.png
    ├── step-001-after.png
    └── ...
```

### Cost Tracking

Token usage is tracked throughout the session:

```typescript
type CostTracker = {
  inputTokens: number;
  outputTokens: number;
  totalCostUSD: number;
  totalCostCZK: number;  // Converted at current rate
};
```

**Features:**
- Running total displayed in debug mode
- Final cost summary in report
- Budget limit with `--budget` flag (default: 1 CZK)
- Session stops if budget exceeded

```bash
# Set custom budget limit
user-agent --url "..." --budget 100  # 100 CZK limit
```

**Report footer includes:**
```markdown
## Session Cost
- Input tokens: 12,450
- Output tokens: 3,200
- Total cost: $0.42 (10.50 CZK)
```

## CLI Interface

```bash
user-agent --url <url> --persona <text> [options]

Options:
  --url          Target URL (required)
  --persona      User persona description (required)
  --intent       What the user wants to achieve (optional, enables explore mode if omitted)
  --explore      Explicit exploratory mode flag
  --steps        Maximum number of steps (default: 10)
  --timeout      Session timeout in seconds (default: 300)
  --wait         Wait time between actions in seconds (default: 10)
  --credentials  Login credentials as "key=value,key=value"
  --output       Output file path (default: ./report.md)
  --debug        Enable debug mode ("true" for debug, "ultra" for ultra debug)
  --budget       Maximum cost in CZK before stopping (default: 50)
```

## Configuration Defaults

```typescript
const defaults = {
  maxSteps: 10,
  timeout: 300,           // 5 minutes
  waitBetweenActions: 10, // seconds
  outputPath: './report.md',
  debug: false,           // false | 'debug' | 'ultra'
  budgetCZK: 1,           // Maximum cost before stopping
  czkPerUsd: 23.5,        // Exchange rate (update as needed)
};
```

## Output Format

Markdown report containing:
- Session metadata (URL, persona, intent, timestamp)
- Timeline of steps with:
  - What AI saw
  - What AI expected
  - What action was taken
  - What actually happened
  - Evaluation (met/unmet/partial/surprised)
  - Notes and observations
- Summary with:
  - Intuitiveness score (heuristic)
  - List of UX issues found
  - Improvement suggestions
  - User perspective quotes ("As a user, I expected...")

## TODO / Future Work

- [ ] **Security:** Secure handling of credentials (secrets management)
- [ ] **HTML Report:** Visual timeline with embedded screenshots
- [ ] **Additional LLM Providers:** OpenAI, Gemini, local models
- [ ] **Persona Presets:** Common persona templates
- [ ] **Video Recording:** Record session as video
- [ ] **CI/CD Integration:** GitHub Actions, etc.

## Coding Guidelines

### Types over Interfaces

**Always use `type` instead of `interface`:**

```typescript
// GOOD: Use type
type UserConfig = {
  name: string;
  age: number;
};

type LLMProvider = {
  analyze(input: Buffer): Promise<Result>;
};

// BAD: Don't use interface
interface UserConfig {
  name: string;
  age: number;
}
```

**Why types?**
- More flexible (unions, intersections, mapped types)
- Consistent across the codebase
- Cannot be accidentally merged (interfaces can be re-declared and merged)
- Better for functional programming style

### Modularity & Separation of Concerns

**Each module must be independent and replaceable:**

```typescript
// GOOD: Module exposes interface, hides implementation
// /src/vision/index.ts
export { VisionProvider } from './types';
export { createVisionProvider } from './factory';

// BAD: Leaking implementation details
export { PlaywrightScreenshot } from './screenshot';
```

**Rules:**
- Each folder in `/src` is a self-contained module
- Modules communicate through types, not concrete implementations
- A module can be replaced by changing only the factory/index file
- No circular dependencies between modules

### DRY (Don't Repeat Yourself)

**Extract common logic into shared utilities:**

```typescript
// BAD: Duplicated retry logic
async function callLLM() {
  for (let i = 0; i < 3; i++) {
    try { return await api.call(); }
    catch { await sleep(1000 * i); }
  }
}

async function takeScreenshot() {
  for (let i = 0; i < 3; i++) {
    try { return await page.screenshot(); }
    catch { await sleep(1000 * i); }
  }
}

// GOOD: Shared utility
import { withRetry } from '@/utils/retry';

const callLLM = () => withRetry(() => api.call(), { attempts: 3 });
const takeScreenshot = () => withRetry(() => page.screenshot(), { attempts: 3 });
```

**Rules:**
- If you write similar code twice, extract it
- Shared utilities go in `/src/utils/`
- Configuration values go in `/src/config/`

### Single Responsibility

**Each file/class/function does ONE thing:**

```typescript
// BAD: One file doing everything
// session.ts - 500 lines handling browser, LLM, reporting...

// GOOD: Split responsibilities
// session.ts - orchestration only
// browser/actions.ts - browser interactions
// llm/analyze.ts - LLM analysis
// report/markdown.ts - report generation
```

**Rules:**
- Files should be under 200 lines (soft limit)
- Functions should be under 30 lines (soft limit)
- If a file needs multiple sections/comments to organize it, split it

### Dependency Injection

**Pass dependencies, don't import them directly:**

```typescript
// BAD: Hard-coded dependency
import { ClaudeLLM } from './claude';

class Session {
  private llm = new ClaudeLLM();
}

// GOOD: Injected dependency
import { LLMProvider } from './types';

class Session {
  constructor(private llm: LLMProvider) {}
}

// Usage
const session = new Session(createLLMProvider('claude'));
```

**Rules:**
- Core classes receive dependencies via constructor
- Use factory functions to create configured instances
- Makes testing easy (inject mocks)

### Type-First Design

**Define types before implementations:**

```typescript
// /src/llm/types.ts - Define contract first
export type LLMProvider = {
  analyze(screenshot: Buffer): Promise<Analysis>;
};

// /src/llm/claude.ts - Then implement
export const createClaudeLLM = (): LLMProvider => ({
  async analyze(screenshot: Buffer): Promise<Analysis> {
    // implementation
  }
});
```

**Rules:**
- Types live in `types.ts` within each module
- Implementation files import from `types.ts`
- Other modules import only from `index.ts` (which re-exports types)
- Prefer factory functions over classes for easier composition

### Error Handling

**Consistent error handling pattern:**

```typescript
// Define module-specific errors
export class VisionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'VisionError';
  }
}

// Wrap external errors
try {
  await page.screenshot();
} catch (error) {
  throw new VisionError('Failed to capture screenshot', error);
}
```

**Rules:**
- Each module defines its own error types in `types.ts`
- Always wrap external errors with context
- Let errors bubble up to session manager for handling

### Naming Conventions

```typescript
// Files: kebab-case
vision-provider.ts
markdown-report.ts

// Types: PascalCase, descriptive
type LLMProvider = { /* ... */ };
type VisionResult = { /* ... */ };

// Factory functions: camelCase, create* prefix
const createClaudeLLM = (): LLMProvider => { /* ... */ };

// Functions: camelCase, verb-first
function createSession() {}
function analyzeScreen() {}
async function captureSnapshot() {}

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT = 300;
const MAX_RETRY_ATTEMPTS = 3;

// Types: PascalCase
type ActionType = 'click' | 'type' | 'scroll';
type EvaluationResult = 'met' | 'unmet' | 'partial';
```

### Code Organization Within Files

```typescript
// 1. Imports (external first, then internal)
import { Page } from 'playwright';
import { LLMProvider } from '@/llm/types';
import { VisionResult } from './types';

// 2. Types (if not in separate types.ts)
type StepConfig = {
  timeout: number;
};

// 3. Constants
const DEFAULT_WAIT = 10_000;

// 4. Main exports (classes, functions)
export class StepExecutor {
  // ...
}

// 5. Helper functions (private, not exported)
function formatDuration(ms: number): string {
  // ...
}
```

### Testing Considerations

**Write code that's easy to test:**

```typescript
// BAD: Hard to test, depends on real browser
class Session {
  async run() {
    const browser = await playwright.chromium.launch();
    // ...
  }
}

// GOOD: Easy to test with mock
class Session {
  constructor(private browser: BrowserManager) {}

  async run() {
    await this.browser.launch();
    // ...
  }
}

// Test
const mockBrowser = { launch: vi.fn() };
const session = new Session(mockBrowser);
```

### Comments

```typescript
// DO: Explain WHY, not WHAT
// Wait 10s because some SPAs have delayed hydration
await wait(10_000);

// DON'T: Obvious comments
// Increment counter by 1
counter++;

// DO: Document public types and functions
/**
 * Captures the current page state for AI analysis.
 * @returns Screenshot buffer and accessibility tree
 */
async capture(): Promise<VisionResult>

// DON'T: Comment out code - delete it
// const oldImplementation = ...
```

## Code Conventions (Summary)

- All comments and documentation in English
- Use TypeScript strict mode
- Async/await for all asynchronous operations
- Descriptive variable names
- Keep vision logic isolated in `/src/vision/`
- Keep LLM logic isolated in `/src/llm/`
- Maximum file length: ~200 lines
- Maximum function length: ~30 lines
- Always use types for module boundaries (not interfaces)
- Inject dependencies, don't hardcode them

## Development Commands

```bash
# Install dependencies
npm install

# Run in development
npm run dev -- --url "https://example.com" --persona "..."

# Build for production
npm run build

# Run tests
npm test

# Run with Docker
docker build -t user-agent .
docker run user-agent --url "https://example.com" --persona "..."
```
