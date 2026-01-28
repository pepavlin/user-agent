# UserAgent

> Simulate real human users to discover UX blind spots

UserAgent is an AI-powered tool that simulates how **real humans** (not testers) interact with your web application. It doesn't test if features work — it evaluates whether they're **intuitive**.

## What Makes It Different?

Traditional E2E tests ask: *"Does clicking this button submit the form?"*

UserAgent asks: *"Would a user even find this button? Would they expect it to submit the form?"*

### For Each Interaction, the AI:

1. **Analyzes the Screen** — Describes what it sees from the user's perspective
2. **Formulates Expectations** — "I expect there's a button to add items..."
3. **Performs an Action** — Click, scroll, type, fill forms, wait
4. **Compares Reality vs Expectation** — Met? Confused? Frustrated? Pleasantly surprised?
5. **Documents Insights** — What was unintuitive, what was missing, what felt slow

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/user-agent.git
cd user-agent

# Install dependencies
npm install

# Build
npm run build
```

## Usage

### Basic Example

```bash
npm run dev -- \
  --url "https://your-app.com" \
  --persona "Jana, 45 years old. Never used the app but knows similar services." \
  --intent "I want to create an account"
```

### Using Persona Presets

List available persona presets:

```bash
npm run dev -- personas
```

Use a preset:

```bash
npm run dev -- \
  --url "https://your-app.com" \
  --persona-preset senior \
  --intent "Find contact information"
```

### Exploratory Mode

Let the AI freely explore without a specific goal:

```bash
npm run dev -- \
  --url "https://your-app.com" \
  --persona "Developer, 30, first time seeing this app" \
  --explore \
  --steps 15
```

### With Authentication

```bash
npm run dev -- \
  --url "https://app.example.com/login" \
  --persona "Regular user, uses the app weekly" \
  --intent "Check my recent orders" \
  --credentials "email=user@test.com,password=test123"
```

### JSON Output for Automation

Generate machine-readable JSON report alongside Markdown:

```bash
npm run dev -- \
  --url "https://your-app.com" \
  --persona-preset tech-novice \
  --intent "Sign up for newsletter" \
  --json report.json
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | Target URL (required) | — |
| `--persona` | Natural language user description | — |
| `--persona-preset` | Use predefined persona (run `personas` command) | — |
| `--intent` | What the user wants to achieve | — |
| `--explore` | Enable exploratory mode (no specific intent) | `false` |
| `--steps` | Maximum number of interaction steps | `10` |
| `--timeout` | Session timeout in seconds | `300` |
| `--wait` | Wait time after each action (seconds) | `3` |
| `--credentials` | Login credentials (`key=value,key=value`) | — |
| `--output` | Output Markdown report path | `./report.md` |
| `--json` | Output JSON report path (for automation) | — |
| `--debug` | Debug mode (`debug` or `ultra`) | `false` |
| `--budget` | Max cost in CZK before stopping | `5` |
| `--llm` | LLM provider (`claude`, `claude-cli`, `openai`) | `claude-cli` |

### LLM Providers

- **`claude-cli`** (default) — Uses Claude CLI with your Anthropic subscription (no API key needed)
- **`claude`** — Uses Anthropic API directly (requires `ANTHROPIC_API_KEY`)
- **`openai`** — Uses OpenAI API (requires `OPENAI_API_KEY`)

### Debug Modes

```bash
# Normal - minimal output
npm run dev -- --url "..." --persona "..."

# Debug - detailed console logging
npm run dev -- --url "..." --persona "..." --debug

# Ultra debug - saves raw LLM responses, screenshots, and video to tmp/
npm run dev -- --url "..." --persona "..." --debug ultra
```

## Docker

### Build the Image

```bash
docker build -t user-agent .
```

### Run with Docker

```bash
# Basic usage
docker run --rm \
  user-agent \
  --url "https://example.com" \
  --persona "First-time visitor, curious about the service" \
  --intent "Learn what this company does"

# With mounted output directory
docker run --rm \
  -v $(pwd)/reports:/app/reports \
  user-agent \
  --url "https://example.com" \
  --persona-preset senior \
  --intent "Find pricing information" \
  --output /app/reports/report.md \
  --json /app/reports/report.json

# With Anthropic API key (for claude provider)
docker run --rm \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v $(pwd)/reports:/app/reports \
  user-agent \
  --url "https://your-app.com" \
  --persona "Tech-savvy user, 28" \
  --llm claude \
  --output /app/reports/report.md

# Interactive with video output
docker run --rm \
  -v $(pwd)/output:/app/output \
  user-agent \
  --url "https://your-app.com" \
  --persona-preset impatient \
  --intent "Complete checkout" \
  --debug ultra \
  --output /app/output/report.md \
  --json /app/output/report.json
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  user-agent:
    build: .
    volumes:
      - ./reports:/app/reports
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    command: >
      --url "https://your-app.com"
      --persona-preset tech-novice
      --intent "Create an account"
      --output /app/reports/report.md
      --json /app/reports/report.json
```

## Output

### Markdown Report

Human-readable report containing:

- **Session Info** — URL, persona, intent, duration, video link
- **Step-by-Step Timeline**
  - What the AI saw
  - What it expected to happen
  - What action it took
  - What actually happened
  - Evaluation (met/unmet/partial/surprised)
  - Observations and notes
- **Summary**
  - Intuitiveness score (0-10)
  - UX issues discovered
  - Improvement suggestions
  - User perspective quotes
- **Cost Summary**
  - Token usage (input/output)
  - Total cost in USD and CZK

### JSON Report

Machine-readable report for automation and CI/CD integration:

```json
{
  "run_id": "2026-01-28T12-00-00-000Z",
  "url": "https://example.com",
  "persona": {
    "name": "Viktor",
    "description": "Senior user, not tech-savvy..."
  },
  "intent": "Register for the service",
  "duration_ms": 180000,
  "intuitiveness_score": 7.5,
  "artifacts": {
    "video": "/path/to/video.webm",
    "screenshots": []
  },
  "steps": [
    {
      "step": 1,
      "action": "click",
      "target": "btn-login",
      "result": "met",
      "notes": ["Button was easy to find"]
    }
  ],
  "issues": [
    {
      "id": "UX-SEC-001",
      "severity": "medium",
      "category": "security",
      "title": "Missing password requirements",
      "evidence": {
        "step": 3,
        "description": "No indication of password rules"
      },
      "recommendation": "Display password requirements",
      "acceptance_criteria": [
        "Password requirements shown below input field",
        "Strength indicator updates as user types",
        "Invalid requirements highlighted in red"
      ]
    }
  ],
  "positives": [
    {
      "id": "OK-FOR-001",
      "category": "form",
      "title": "Form is clear and simple",
      "evidence": {
        "step": 2,
        "description": "Form has only 4 fields, easy to understand"
      }
    }
  ],
  "observations": [
    {
      "step": 1,
      "text": "Page loads quickly"
    }
  ],
  "summary": {
    "total_steps": 5,
    "met": 4,
    "partial": 1,
    "failed": 0
  }
}
```

### Example Markdown Snippet

```markdown
## Step 3: Looking for playlist creation

**Saw:** Homepage with featured playlists and a sidebar menu

**Expected:** "I expect there's an obvious way to create my own playlist,
probably a '+' button or 'Create' option"

**Action:** Clicked on "Your Library" in sidebar

**Result:** Library opened but shows empty state with no clear 'create' option

**Evaluation:** PARTIAL

**Notes:**
- The 'Create Playlist' option is hidden in a context menu
- As a user, I expected a prominent button for such a core feature
- Frustration: Had to click around to find it
```

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                      UserAgent                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐    ┌─────────┐             │
│  │ Vision  │───▶│   LLM   │───▶│ Browser │             │
│  │ Module  │    │ (Claude)│    │(Playwrt)│             │
│  └─────────┘    └─────────┘    └─────────┘             │
│       │              │              │                   │
│       ▼              ▼              ▼                   │
│  Screenshot    Expectations    Actions                  │
│  + A11y Tree   + Decisions     + Click/Type/Fill       │
│                + Evaluation    + Scroll/Navigate       │
├─────────────────────────────────────────────────────────┤
│              Markdown + JSON Reports                    │
│                  + Video Recording                      │
└─────────────────────────────────────────────────────────┘
```

1. **Vision Module** captures screenshot (what AI "sees") and accessibility tree (how to locate elements)
2. **LLM** analyzes the screen, formulates expectations, decides actions, evaluates results
3. **Browser** executes actions via Playwright (click, type, fill forms, scroll, navigate)
4. **Reports** document everything in Markdown (human) and JSON (machine) format

## Actions

The AI can perform these actions:

| Action | Description |
|--------|-------------|
| `click` | Click on an element |
| `type` | Type text into a single input |
| `fill` | Fill multiple form fields at once (e.g., login form) |
| `scroll` | Scroll the page |
| `navigate` | Go to a URL |
| `wait` | Wait for something to happen |
| `read` | Read and analyze content |

## Configuration

### Environment Variables

```bash
# For 'claude' provider - Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...

# For 'openai' provider - OpenAI API key
OPENAI_API_KEY=sk-...
```

### Using Claude CLI (Default)

The default `claude-cli` provider uses your Claude subscription directly via the CLI tool. No API key is needed — just make sure you have `claude` CLI installed and authenticated:

```bash
# Install Claude CLI (if not already installed)
npm install -g @anthropic-ai/claude-cli

# Authenticate
claude auth login
```

## Programmatic API

UserAgent can be used as a library in your own applications:

### Installation

```bash
npm install user-agent
# or
npm link  # for local development
```

### Simple Usage

```typescript
import { runTest } from 'user-agent';

const result = await runTest({
  url: 'https://example.com',
  persona: 'Senior user, 65, not tech-savvy',
  intent: 'Find contact page',
});

// Check results
console.log(`Intuitiveness: ${result.report.summary.intuitivenessScore}/10`);
console.log(`Issues found: ${result.json.issues.length}`);

// Access structured issues
for (const issue of result.json.issues) {
  console.log(`[${issue.severity}] ${issue.title}`);
}
```

### Using Persona Presets

```typescript
import { runTest } from 'user-agent';

const result = await runTest({
  url: 'https://example.com',
  persona: 'senior',  // Uses built-in preset
  intent: 'Register for newsletter',
});
```

### Full Configuration

```typescript
import { runTest } from 'user-agent';

const result = await runTest({
  url: 'https://example.com',
  persona: 'Jana, 45, first time user',
  intent: 'Create an account',
  maxSteps: 15,
  waitBetweenActions: 5,
  timeout: 600,
  budgetCZK: 10,
  llm: 'claude-cli',
  debug: 'ultra',
  markdownPath: './reports/test.md',
  jsonPath: './reports/test.json',
  credentials: {
    email: 'test@example.com',
    password: 'secret123',
  },
});
```

### Running Multiple Tests

```typescript
import { runTests } from 'user-agent';

const results = await runTests([
  { url: 'https://example.com', persona: 'senior', intent: 'Register' },
  { url: 'https://example.com', persona: 'tech-savvy', intent: 'Register' },
  { url: 'https://example.com', persona: 'impatient', intent: 'Register' },
]);

// Compare scores across personas
for (const result of results) {
  const persona = result.report.config.persona.slice(0, 30);
  const score = result.report.summary.intuitivenessScore;
  console.log(`${persona}...: ${score}/10`);
}
```

### Advanced: Custom Dependencies

```typescript
import {
  runSession,
  createBrowserManager,
  createLLMProvider,
  createMarkdownReportGenerator,
  createLogger,
  createCostTracker,
  createTestConfig,
} from 'user-agent';

// Create custom configuration
const config = createTestConfig({
  url: 'https://example.com',
  persona: 'Developer testing the app',
  intent: 'Check API documentation',
});

// Create dependencies with custom settings
const browser = createBrowserManager();
const llm = createLLMProvider('claude');  // Use API instead of CLI
const logger = createLogger('debug');
const costTracker = createCostTracker(100, 23.5);  // 100 CZK budget
const reportGenerator = createMarkdownReportGenerator();

// Run session
const report = await runSession(config, {
  llm,
  browser,
  logger,
  costTracker,
  reportGenerator,
});
```

### TypeScript Types

All types are exported for full TypeScript support:

```typescript
import type {
  TestConfig,
  TestResult,
  SessionConfig,
  SessionReport,
  JsonReport,
  JsonReportIssue,
  StepResult,
} from 'user-agent';
```

## Use Cases

- **UX Audits** — Discover unintuitive flows before users complain
- **Onboarding Review** — See your app through a new user's eyes
- **Accessibility Insights** — AI notices when things are hard to find
- **Competitive Analysis** — Compare intuitiveness across similar apps
- **Design Validation** — Test if your design matches user expectations
- **CI/CD Integration** — Use JSON output to track UX metrics over time

## Roadmap

- [x] Video recording of sessions
- [x] Persona presets library
- [x] JSON output for automation
- [x] Form filling (multiple inputs at once)
- [x] Programmatic API for integration
- [ ] HTML reports with embedded screenshots
- [ ] Additional LLM providers (Gemini)
- [ ] CI/CD integration examples
- [ ] Comparison mode (before/after)
- [ ] Screenshot persistence in reports

## Contributing

Contributions are welcome! Please read the development guide in [CLAUDE.md](./CLAUDE.md).

## License

MIT
