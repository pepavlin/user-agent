# Architecture

## Overview

UserAgent follows a modular architecture with clear separation of concerns. Each module can be modified or replaced independently.

```
┌──────────────────────────────────────────────────────────────────┐
│                              CLI                                  │
│                    (Entry point, arg parsing)                     │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Session Manager                            │
│              (Orchestrates the entire session flow)               │
└───────┬─────────────────────┬────────────────────────┬───────────┘
        │                     │                        │
        ▼                     ▼                        ▼
┌───────────────┐    ┌───────────────┐    ┌────────────────────────┐
│    Vision     │    │      LLM      │    │        Browser         │
│    Module     │    │   Provider    │    │       Manager          │
├───────────────┤    ├───────────────┤    ├────────────────────────┤
│ - Screenshot  │    │ - Claude      │    │ - Playwright instance  │
│ - A11y Tree   │    │ - (OpenAI)    │    │ - Page navigation      │
│ - Element     │    │ - (Gemini)    │    │ - Actions (click,      │
│   location    │    │ - (Local)     │    │   type, scroll)        │
└───────────────┘    └───────────────┘    └────────────────────────┘
        │                     │                        │
        └─────────────────────┼────────────────────────┘
                              │
                              ▼
                    ┌───────────────┐
                    │    Report     │
                    │   Generator   │
                    ├───────────────┤
                    │ - Markdown    │
                    │ - (HTML)      │
                    │ - (JSON)      │
                    └───────────────┘
```

## Module Details

### CLI (`/src/cli/`)

Responsible for:
- Parsing command-line arguments
- Validating inputs
- Initializing the session
- Handling errors and exit codes

### Session Manager (`/src/core/session.ts`)

The main orchestrator that:
- Manages the session lifecycle
- Coordinates between modules
- Tracks step count and timeout
- Handles session termination conditions

### Vision Module (`/src/vision/`)

**Intentionally isolated** for easy modification.

Two components:
1. **Screenshot** - Captures what the AI "sees"
2. **Accessibility Snapshot** - Provides element references for interaction

```typescript
type VisionProvider = {
  capture(page: Page): Promise<VisionResult>;
  locateElement(snapshot: AccessibilityTree, description: string): ElementRef | null;
};

type VisionResult = {
  screenshot: Buffer;
  snapshot: AccessibilityTree;
  timestamp: number;
};
```

**Why separated?**
- Could swap screenshot for a different visual representation
- Could use different element location strategies
- Makes testing easier

### LLM Provider (`/src/llm/`)

**Model-agnostic type** allowing different AI providers.

```typescript
type LLMProvider = {
  // Analyze what's on screen
  analyzeScreen(input: AnalyzeInput): Promise<ScreenAnalysis>;

  // Formulate expectations before action
  formulateExpectation(input: ExpectationInput): Promise<Expectation>;

  // Decide what action to take
  decideAction(input: DecisionInput): Promise<ActionDecision>;

  // Evaluate result after action
  evaluateResult(input: EvaluationInput): Promise<Evaluation>;
};
```

**Implementations:**
- `claude.ts` - Primary implementation using Anthropic API
- `openai.ts` - Future OpenAI/GPT-4 implementation
- `mock.ts` - For testing

### Browser Manager (`/src/browser/`)

Playwright wrapper providing:
- Browser instance lifecycle
- Page navigation
- Action execution (click, type, scroll, wait)
- Credential handling for authentication

```typescript
type BrowserManager = {
  launch(): Promise<void>;
  navigate(url: string): Promise<void>;
  executeAction(action: ActionDecision, elementRef: ElementRef): Promise<ActionResult>;
  close(): Promise<void>;
};
```

### Report Generator (`/src/report/`)

Transforms session data into readable output:
- Markdown (primary)
- HTML with screenshots (future)
- JSON for programmatic access (future)

## Data Flow

### Single Step Execution

```
1. Vision.capture()
   └─▶ { screenshot, snapshot }

2. LLM.analyzeScreen(screenshot, persona, context)
   └─▶ { description, elements, observations }

3. LLM.formulateExpectation(analysis, intent)
   └─▶ { expectation, expectedDuration, confidence }

4. LLM.decideAction(analysis, expectation)
   └─▶ { actionType, targetDescription, reasoning }

5. Vision.locateElement(snapshot, targetDescription)
   └─▶ elementRef

6. Browser.executeAction(action, elementRef)
   └─▶ { success, error? }

7. Wait(config.waitBetweenActions)

8. Vision.capture()
   └─▶ { newScreenshot, newSnapshot }

9. LLM.evaluateResult(expectation, newScreenshot)
   └─▶ { evaluation, notes, suggestions }

10. Report.addStep(stepData)
```

## Session Termination

Session ends when any of these conditions are met:
- Maximum steps reached (`--steps`)
- Timeout reached (`--timeout`)
- Intent achieved (AI determines goal is complete)
- Unrecoverable error (browser crash, network failure)
- AI decides to stop (in explore mode: "nothing new to explore")

## Error Handling

Each module handles its own errors and surfaces them appropriately:
- Vision errors → Retry once, then fail step
- LLM errors → Retry with exponential backoff, then fail session
- Browser errors → Attempt recovery, log, continue if possible
- Report errors → Log warning, attempt alternative output

## Configuration Injection

Configuration flows from CLI → Session → All modules:

```typescript
type SessionConfig = {
  url: string;
  persona: string;
  intent?: string;
  maxSteps: number;
  timeout: number;
  waitBetweenActions: number;
  credentials?: Credentials;
  outputPath: string;
  llmProvider: 'claude' | 'openai';
};
```

## Extensibility Points

1. **New LLM Provider** - Implement `LLMProvider` type
2. **New Vision Strategy** - Implement `VisionProvider` type
3. **New Report Format** - Add new generator in `/src/report/`
4. **New Actions** - Extend `ActionType` and `BrowserManager`
