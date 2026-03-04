# Architecture Overview

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Entry Points                                  │
│         CLI (/src/cli/)          Server (/src/server/)                │
│         Programmatic API (/src/index.ts)                             │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Session Manager                                 │
│               (/src/core/session.ts, step.ts, context.ts)            │
│                Orchestrates the entire session flow                   │
└───────┬──────────────────┬───────────────────────┬───────────────────┘
        │                  │                       │
        ▼                  ▼                       ▼
┌───────────────┐  ┌───────────────┐  ┌────────────────────────────────┐
│    Vision     │  │      LLM      │  │           Browser              │
│    Module     │  │   Provider    │  │          Manager               │
├───────────────┤  ├───────────────┤  ├────────────────────────────────┤
│ - Screenshot  │  │ - Claude API  │  │ - Playwright instance          │
│ - ARIA        │  │ - Claude CLI  │  │ - Page navigation              │
│   snapshot    │  │ - (OpenAI)    │  │ - Actions (click, type, fill,  │
│ - Element IDs │  │               │  │   scroll, wait, navigate,read) │
└───────────────┘  └───────────────┘  │ - Video recording (ultra)      │
        │                  │          └────────────────────────────────┘
        └──────────────────┼───────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     Report Generator   │
              ├────────────────────────┤
              │ - Markdown report      │
              │ - JSON report          │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     Webhooks / API     │
              │  Session notifications │
              └────────────────────────┘
```

## Module Responsibilities

| Module | Path | Responsibility |
|--------|------|----------------|
| CLI | `/src/cli/` | Argument parsing, persona preset resolution, entry point |
| Core | `/src/core/` | Session orchestration, step execution, context management |
| Vision | `/src/vision/` | Screenshot capture, ARIA snapshot parsing, element ID generation |
| LLM | `/src/llm/` | AI provider abstraction, prompt management, response parsing |
| Browser | `/src/browser/` | Playwright wrapper, action execution, video recording |
| Report | `/src/report/` | Markdown and JSON report generation, issue classification |
| Server | `/src/server/` | REST API (Fastify), session management, authentication |
| Utils | `/src/utils/` | Logger, cost tracker, retry logic, webhook delivery |
| Config | `/src/config/` | Default values, persona presets |

## Dependency Injection

Core classes receive dependencies via constructor/factory parameters rather than importing concrete implementations:

```typescript
// Session receives all dependencies
type SessionDeps = {
  browser: BrowserManager;
  vision: VisionProvider;
  llm: LLMProvider;
  report: ReportGenerator;
  logger: Logger;
  costTracker: CostTracker;
};

const result = await runSession(config, deps);
```

This enables:
- Easy testing with mocks
- Swapping LLM providers without changing session logic
- Independent module development

## Error Handling

Each module defines its own error types and wraps external errors with context:

```typescript
// Example: LLM module errors
class LLMError extends Error {
  code: 'CREDITS_EXHAUSTED' | 'RATE_LIMITED' | 'TIMEOUT';
}
```

Error handling strategy:
- **Vision errors** — Retry once, then fail the step
- **LLM errors** — Retry with exponential backoff (3 attempts), then fail the session
- **Browser errors** — Attempt recovery, log, continue if possible
- **Webhook errors** — Logged and swallowed (never block session)

Errors bubble up to the session manager which decides whether to continue or terminate.

## Source Tree

```
src/
├── cli/
│   └── index.ts
├── core/
│   ├── session.ts
│   ├── step.ts
│   ├── context.ts
│   ├── index.ts
│   └── types.ts
├── vision/
│   ├── index.ts
│   ├── screenshot.ts
│   ├── snapshot.ts
│   └── types.ts
├── llm/
│   ├── types.ts
│   ├── claude.ts
│   ├── claude-cli.ts
│   ├── index.ts
│   └── prompts/
│       ├── analyze.ts
│       ├── expect.ts
│       ├── decide.ts
│       ├── expect-and-decide.ts
│       ├── evaluate.ts
│       ├── summarize.ts
│       ├── page-context.ts
│       └── index.ts
├── browser/
│   ├── index.ts
│   ├── actions.ts
│   └── types.ts
├── report/
│   ├── index.ts
│   ├── markdown.ts
│   ├── json.ts
│   └── types.ts
├── server/
│   ├── index.ts
│   └── types.ts
├── utils/
│   ├── logger.ts
│   ├── cost.ts
│   ├── retry.ts
│   ├── webhook.ts
│   ├── index.ts
│   └── types.ts
├── config/
│   ├── defaults.ts
│   └── personas.ts
└── index.ts            # Programmatic API (runTest, runTests)
```
