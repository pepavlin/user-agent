# Defaults and Configuration

## Default Values

```typescript
const defaults = {
  maxSteps: 10,
  timeout: 300,             // seconds (5 minutes)
  waitBetweenActions: 3,    // seconds
  outputPath: './report.md',
  debug: false,             // false | 'debug' | 'ultra'
  budgetCZK: 5,
  czkPerUsd: 23.5,
  webhookTimeoutMs: 5000,
};
```

## Debug Modes

Three verbosity levels controlled by the `--debug` flag:

```bash
# Normal mode (default)
user-agent --url "..."

# Debug mode — detailed console output
user-agent --url "..." --debug

# Ultra debug mode — saves everything to tmp/
user-agent --url "..." --debug ultra
```

| Mode | Console Output | File Output |
|------|----------------|-------------|
| Normal | Progress + step info | `report.md` only |
| Debug | + debug messages, error stacks | `report.md` only |
| Ultra | + all above | `tmp/llm-responses/*.json`, `tmp/screenshots/*.png`, `tmp/videos/` |

### Ultra Debug File Structure

```
tmp/
├── llm-responses/
│   ├── step-001-analyze.json
│   ├── step-001-expectAndDecide.json
│   ├── step-001-evaluate.json
│   └── ...
├── screenshots/
│   ├── step-001-before.png
│   ├── step-001-after.png
│   └── ...
└── videos/
    └── <session-video>.webm
```

### Log Format

```
[2024-01-01T12:00:00.000Z] [INFO] Session started
[2024-01-01T12:00:01.000Z] [Step 1] Analyzing screen...
[2024-01-01T12:00:02.000Z] [DEBUG] LLM response received (debug/ultra only)
```

## Budget System

Token usage is tracked throughout the session to prevent runaway costs.

### Pricing

Based on Claude Sonnet pricing:
- **Input tokens:** $3 / 1M tokens
- **Output tokens:** $15 / 1M tokens

### Cost Tracker

```typescript
type CostTracker = {
  addUsage(inputTokens: number, outputTokens: number): void;
  getTotalCostUSD(): number;
  getTotalCostCZK(): number;
  getInputTokens(): number;
  getOutputTokens(): number;
  isOverBudget(): boolean;
};
```

Created with `createCostTracker(budgetCZK, czkPerUsd)`.

### Behavior

- Every LLM response includes token counts that are accumulated by the cost tracker
- Between steps, the session checks `isOverBudget()` — if true, the session stops
- Default budget: **5 CZK** (configurable via `--budget`)
- Exchange rate: **23.5 CZK/USD** (hardcoded in defaults)
- Final cost is included in the report footer

## Retry Utility

Shared retry logic used across modules:

```typescript
type RetryOptions = {
  attempts?: number;    // default: 3
  delayMs?: number;     // default: 1000
  backoff?: boolean;    // default: true (exponential: delay × attempt)
};

withRetry(fn, options?): Promise<T>
```
