# LLM Module

The LLM module (`/src/llm/`) provides a model-agnostic abstraction for all AI interactions. All LLM calls go through the `LLMProvider` interface, making it easy to swap implementations.

## LLMProvider Interface

```typescript
type LLMProvider = {
  getPageContext(input: PageContextInput): Promise<LLMResponse<string>>;
  analyzeScreen(input: AnalyzeInput): Promise<LLMResponse<ScreenAnalysis>>;
  formulateExpectation(input: ExpectationInput): Promise<LLMResponse<Expectation>>;
  decideAction(input: DecisionInput): Promise<LLMResponse<ActionDecision>>;
  expectAndDecide(input: ExpectAndDecideInput): Promise<LLMResponse<ExpectAndDecideResult>>;
  evaluateResult(input: EvaluationInput): Promise<LLMResponse<Evaluation>>;
  summarizeContext(input: SummarizeInput): Promise<LLMResponse<string>>;
};

type LLMResponse<T> = {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
};
```

### Methods

| Method | Purpose | Output |
|--------|---------|--------|
| `getPageContext` | Identify the type of website | Plain text description |
| `analyzeScreen` | Describe what's visible on screen | `ScreenAnalysis` (description, elements, observations) |
| `formulateExpectation` | Predict what will happen before an action | `Expectation` (what, expectedTime, confidence) |
| `decideAction` | Choose the next action | `ActionDecision` (action, elementId, value, reasoning) |
| `expectAndDecide` | Combined expectation + decision (default flow) | `ExpectAndDecideResult` |
| `evaluateResult` | Compare expectation vs reality after action | `Evaluation` (result, reality, notes, suggestions) |
| `summarizeContext` | Generate rolling context summary | Plain text summary |

## Implementations

### Claude API (`claude.ts`)

Primary implementation using the Anthropic SDK.

- **Model:** `claude-sonnet-4-20250514`
- **API timeout:** 60,000 ms
- **Retry:** 3 attempts, 2,000 ms delay
- **Auth:** `ANTHROPIC_API_KEY` environment variable
- **Error codes:** `CREDITS_EXHAUSTED`, `RATE_LIMITED`, `TIMEOUT`

### Claude CLI (`claude-cli.ts`)

Alternative implementation that spawns Claude Code as a subprocess.

- **Command:** `claude --dangerously-skip-permissions`
- **CLI timeout:** 180,000 ms (3 minutes)
- **Retry:** 3 attempts
- **Auth:** Uses `CLAUDE_CODE_OAUTH_TOKEN` (removes `ANTHROPIC_API_KEY` from env)
- **Images:** Saved as temp PNG files in `./tmp/llm-images/`, cleaned up after each call
- **Token counts:** Estimated (`length / 4`) since CLI doesn't report exact usage

### Factory

```typescript
type LLMProviderType = 'claude' | 'claude-cli' | 'openai';

createLLMProvider(type: LLMProviderType = 'claude'): LLMProvider
```

The `openai` type is declared but not yet implemented.

## Prompt Files

All prompts are stored in `/src/llm/prompts/` as separate files:

| File | Function | Output Format |
|------|----------|---------------|
| `page-context.ts` | `createPageContextPrompt` | Plain text |
| `analyze.ts` | `createAnalyzePrompt` | JSON: `{ description, mainElements[], observations[] }` |
| `expect.ts` | `createExpectationPrompt` | JSON: `{ what, expectedTime, confidence }` |
| `decide.ts` | `createDecisionPrompt` | JSON: `{ action, elementId?, value?, reasoning }` |
| `expect-and-decide.ts` | `createExpectAndDecidePrompt` | JSON: `{ expectation, decision }` |
| `evaluate.ts` | `createEvaluationPrompt` | JSON: `{ result, reality, notes[], suggestions[], userQuote? }` |
| `summarize.ts` | `createSummarizePrompt` | Plain text (1-2 sentences) |

All prompts instruct the AI to respond in the language of the persona description.

The `expect-and-decide.ts` prompt is the optimized version used in the default step flow — it combines expectation formulation and action decision into a single LLM call. It also supports coordinate-based clicks via `coordinates: { x, y }` for visual elements not in the ARIA snapshot.

## Cost Tracking Integration

Every `LLMResponse` includes token usage. The session's `CostTracker` accumulates these across all LLM calls. See [Defaults — Budget System](../configuration/defaults.md#budget-system) for details.
