# Step Lifecycle

## Session Flow

A session represents one complete user simulation from start to finish.

```
1. Launch browser
   └─▶ Optional video recording (ultra debug mode)

2. Navigate to target URL

3. Create VisionProvider (bound to page)

4. Page context capture
   └─▶ vision.capture() → llm.getPageContext()
   └─▶ Stored as pageContext in SessionContext

5. Step loop (up to maxSteps)
   ├─▶ Check timeout
   ├─▶ Check budget (costTracker.isOverBudget())
   ├─▶ executeStep()
   └─▶ llm.summarizeContext() → updateContext()

6. Close browser (capture video path)

7. Generate reports
   ├─▶ Markdown report → save to outputPath
   └─▶ JSON report → save to jsonOutputPath (if configured)
```

## Step Execution Flow

Each step simulates one user interaction cycle:

```
1. vision.capture()
   └─▶ { screenshot, snapshot, timestamp }
       (screenshot + ARIA snapshot captured in parallel)

2. llm.analyzeScreen(screenshot, snapshot, persona, context)
   └─▶ { description, mainElements[], observations[] }

3. llm.expectAndDecide(analysis, snapshot, persona, context)
   └─▶ { expectation: { what, expectedTime, confidence },
         decision: { action, elementId?, coordinates?, value?, inputs?, reasoning } }
       (combined into one LLM call for efficiency)

4. browser.setSnapshot(snapshot) + browser.executeAction(decision)
   └─▶ { success, error?, duration }

5. wait(config.waitBetweenActions)

6. vision.capture()
   └─▶ { afterScreenshot }

7. llm.evaluateResult(expectation, action, beforeScreenshot, afterScreenshot, persona, context)
   └─▶ { result, reality, notes[], suggestions[], userQuote? }

8. Return StepResult
```

The `expectAndDecide` prompt combines expectation formulation and action decision into a single LLM call to reduce latency and cost. Individual `formulateExpectation` and `decideAction` methods exist but are not used in the default flow.

## Context Management

To prevent context explosion, sessions maintain a **rolling summary** rather than full step history:

```typescript
type SessionContext = {
  intent?: string;           // Original user intent
  pageContext?: string;      // AI-generated page type description
  currentSummary: string;    // Rolling summary of progress
  lastStepResult?: StepResult;
  stepCount: number;
  issuesFound: string[];     // Accumulated UX issues
};
```

After each step (except the last), the LLM generates a brief summary:

> "Navigated to homepage, found search bar, searched for 'relaxing music'. Currently viewing search results with 10 playlists shown."

The `updateContext` function also scans evaluation notes for issue keywords (English and Czech) to populate `issuesFound[]`.

## Session Termination

A session ends when any condition is met:

| Condition | Source |
|-----------|--------|
| Maximum steps reached | `--steps` / `maxSteps` config |
| Timeout reached | `--timeout` / `timeout` config |
| Budget exceeded | `costTracker.isOverBudget()` |
| Unrecoverable error | Browser crash, network failure |

## Intuitiveness Score

Calculated from step evaluation results after the session:

| Result | Score Penalty |
|--------|---------------|
| `met` | 0 |
| `partial` | -1 |
| `surprised` | -1.5 |
| `unmet` | -2 |

Starting score: **10**. Final score is clamped to 0–10 and rounded to 1 decimal place.
