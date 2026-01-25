# UserAgent

> Simulate real human users to discover UX blind spots

UserAgent is an AI-powered tool that simulates how **real humans** (not testers) interact with your web application. It doesn't test if features work — it evaluates whether they're **intuitive**.

## What Makes It Different?

Traditional E2E tests ask: *"Does clicking this button submit the form?"*

UserAgent asks: *"Would a user even find this button? Would they expect it to submit the form?"*

### For Each Interaction, the AI:

1. **Formulates Expectations** — "I expect there's a button to add items..."
2. **Performs an Action** — Click, scroll, type, wait
3. **Compares Reality vs Expectation** — Met? Confused? Frustrated? Pleasantly surprised?
4. **Documents Insights** — What was unintuitive, what was missing, what felt slow

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

### Docker

```bash
docker build -t user-agent .
```

## Usage

### Basic Example

```bash
user-agent \
  --url "https://spotify.com" \
  --persona "Jana, 45 years old. Never used Spotify but knows YouTube. Not tech-savvy." \
  --intent "I want to play some relaxing music"
```

### Exploratory Mode

Let the AI freely explore without a specific goal:

```bash
user-agent \
  --url "https://your-app.com" \
  --persona "Developer, 30, first time seeing this app" \
  --explore \
  --steps 15
```

### With Authentication

```bash
user-agent \
  --url "https://app.example.com/login" \
  --persona "Regular user, uses the app weekly" \
  --intent "Check my recent orders" \
  --credentials "email=user@test.com,password=test123"
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | Target URL (required) | — |
| `--persona` | Natural language user description (required) | — |
| `--intent` | What the user wants to achieve | — |
| `--explore` | Enable exploratory mode (no specific intent) | `false` |
| `--steps` | Maximum number of interaction steps | `10` |
| `--timeout` | Session timeout in seconds | `300` |
| `--wait` | Wait time after each action (seconds) | `10` |
| `--credentials` | Login credentials (`key=value,key=value`) | — |
| `--output` | Output report path | `./report.md` |
| `--debug` | Debug mode (`true` or `ultra`) | `false` |
| `--budget` | Max cost in CZK before stopping | `1` |

### Debug Modes

```bash
# Normal - minimal output
user-agent --url "..." --persona "..."

# Debug - detailed console logging
user-agent --url "..." --persona "..." --debug

# Ultra debug - saves raw LLM responses and screenshots to tmp/
user-agent --url "..." --persona "..." --debug ultra
```

## Output

UserAgent generates a Markdown report containing:

- **Session Info** — URL, persona, intent, duration
- **Step-by-Step Timeline**
  - What the AI saw
  - What it expected to happen
  - What action it took
  - What actually happened
  - Evaluation (expectation met/unmet/partial)
  - Observations and notes
- **Summary**
  - Intuitiveness score
  - UX issues discovered
  - Improvement suggestions
  - User perspective quotes
- **Cost Summary**
  - Token usage (input/output)
  - Total cost in USD and CZK

### Example Output Snippet

```markdown
## Step 3: Looking for playlist creation

**Saw:** Homepage with featured playlists and a sidebar menu

**Expected:** "I expect there's an obvious way to create my own playlist,
probably a '+' button or 'Create' option"

**Action:** Clicked on "Your Library" in sidebar

**Result:** Library opened but shows empty state with no clear 'create' option

**Evaluation:** ❌ Expectation not met

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
│  + A11y Tree   + Decisions     + Interactions          │
│                + Evaluation                             │
├─────────────────────────────────────────────────────────┤
│                  Markdown Report                        │
└─────────────────────────────────────────────────────────┘
```

1. **Vision Module** captures screenshot (what AI "sees") and accessibility tree (how to locate elements)
2. **LLM** analyzes the screen, formulates expectations, decides actions, evaluates results
3. **Browser** executes the decided actions via Playwright
4. **Report** documents everything in human-readable format

## Configuration

### Environment Variables

```bash
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...

# Optional: anthropic/openai (default: anthropic)
LLM_PROVIDER=anthropic
```

## Use Cases

- **UX Audits** — Discover unintuitive flows before users complain
- **Onboarding Review** — See your app through a new user's eyes
- **Accessibility Insights** — AI notices when things are hard to find
- **Competitive Analysis** — Compare intuitiveness across similar apps
- **Design Validation** — Test if your design matches user expectations

## Roadmap

- [ ] HTML reports with embedded screenshots
- [ ] Video recording of sessions
- [ ] Additional LLM providers (OpenAI, Gemini)
- [ ] Persona presets library
- [ ] CI/CD integration
- [ ] Comparison mode (before/after)

## Contributing

Contributions are welcome! Please read the development guide in [CLAUDE.md](./CLAUDE.md).

## License

MIT
