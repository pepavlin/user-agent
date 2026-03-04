# CLI Reference

## Usage

```bash
user-agent run [options]
user-agent personas
```

## Commands

### `run` (default)

Run a UserAgent session.

```bash
user-agent --url "https://example.com" --persona "Jana, 45, not tech-savvy"
```

### `personas`

List all available persona presets with descriptions and sample intents.

```bash
user-agent personas
```

## Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--url <url>` | Yes | — | Target URL to test |
| `--persona <text>` | One of* | — | Natural language user description |
| `--persona-preset <key>` | One of* | — | Built-in persona key (see [Personas](personas.md)) |
| `--intent <text>` | No | — | Goal the user wants to achieve |
| `--explore` | No | `false` | Enable exploratory mode (no specific goal) |
| `--steps <number>` | No | `10` | Maximum number of steps |
| `--timeout <seconds>` | No | `300` | Session timeout |
| `--wait <seconds>` | No | `3` | Wait time between actions |
| `--credentials <pairs>` | No | — | Login credentials as `key=value,key=value` |
| `--output <path>` | No | `./report.md` | Markdown report output path |
| `--json <path>` | No | — | JSON report output path |
| `--debug [level]` | No | `false` | Debug mode: `debug` or `ultra` |
| `--budget <czk>` | No | `5` | Maximum cost in CZK |
| `--llm <provider>` | No | `claude-cli` | LLM provider: `claude`, `claude-cli`, `openai` |
| `--webhook <url>` | No | — | Webhook URL for session notifications |

\* Either `--persona` or `--persona-preset` must be provided.

## Examples

```bash
# Basic session with custom persona
user-agent --url "https://spotify.com" \
  --persona "Jana, 45, never used Spotify, not tech-savvy" \
  --intent "Find and play relaxing music"

# Using a persona preset
user-agent --url "https://example.com" \
  --persona-preset elderly \
  --intent "Find contact information"

# Exploratory mode (no specific goal)
user-agent --url "https://example.com" \
  --persona "Martin, 30, power user" \
  --explore

# Full options
user-agent --url "https://example.com" \
  --persona-preset gen-z \
  --intent "Sign up for an account" \
  --steps 20 \
  --timeout 600 \
  --wait 5 \
  --budget 50 \
  --llm claude \
  --debug ultra \
  --output ./reports/session.md \
  --json ./reports/session.json \
  --credentials "email=test@example.com,password=secret123" \
  --webhook "https://hooks.example.com/ux-results"
```
