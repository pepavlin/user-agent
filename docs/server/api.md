# REST API

The server module (`/src/server/`) provides a Fastify-based REST API for running UserAgent sessions programmatically.

## Starting the Server

```bash
# Via Docker (default entrypoint)
docker compose up

# Directly
node dist/server/index.js
```

**Default port:** `3000` (configurable via `PORT` env var)

Swagger documentation is available at `/docs`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | No | API key for authentication. If unset, auth is disabled |
| `LLM_PROVIDER` | No | LLM provider: `claude`, `claude-cli` (default: `claude`) |
| `ANTHROPIC_API_KEY` | If using `claude` | Anthropic API key |
| `CLAUDE_CODE_OAUTH_TOKEN` | If using `claude-cli` | Claude Code OAuth token |
| `PORT` | No | Server port (default: `3000`) |
| `MAX_CONCURRENT_SESSIONS` | No | Maximum sessions running at once (default: `2`) |

## Authentication

Requests are authenticated via API key in one of two headers:

- `X-API-Key: <key>`
- `Authorization: Bearer <key>`

When the `API_KEY` environment variable is not set, authentication is disabled.

## Endpoints

### `GET /health`

Health check. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 12345
}
```

### `POST /sessions`

Create and start a new session. The session runs in the background.

**Request body:**
```json
{
  "url": "https://example.com",
  "persona": "Jana, 45, never used this app before",
  "intent": "Find and purchase a product",
  "maxSteps": 10,
  "timeout": 300,
  "waitBetweenActions": 3,
  "budgetCZK": 5,
  "credentials": "email=test@example.com,password=secret",
  "webhookUrl": "https://my-service.com/webhook"
}
```

| Field | Required | Validation |
|-------|----------|------------|
| `url` | Yes | Valid URL |
| `persona` | Yes | Non-empty string |
| `intent` | No | String |
| `maxSteps` | No | 1–50 (default: 10) |
| `timeout` | No | 10–3600 (default: 300) |
| `waitBetweenActions` | No | 1–60 (default: 3) |
| `budgetCZK` | No | >= 1 (default: 5) |
| `credentials` | No | `key=value,key=value` format |
| `webhookUrl` | No | Valid URL |

**Response (201):**
```json
{
  "sessionId": "abc123",
  "status": "pending"
}
```

**Response (429)** — when concurrent session limit is reached:
```json
{
  "error": "Maximum concurrent sessions limit reached (2). Please wait for a running session to complete before starting a new one."
}
```

### `GET /sessions/:id`

Get session details. Returns full state including reports when completed.

**Response:**
```json
{
  "id": "abc123",
  "status": "completed",
  "config": { "url": "...", "persona": "..." },
  "createdAt": 1709000000000,
  "startedAt": 1709000001000,
  "completedAt": 1709000060000,
  "progress": {
    "currentStep": 10,
    "totalSteps": 10,
    "lastMessage": "Step 10 completed"
  },
  "report": "# UserAgent Session Report\n...",
  "jsonReport": { "run_id": "...", "issues": [] },
  "error": null
}
```

### `GET /sessions`

List all sessions, sorted newest-first.

**Response:**
```json
[
  {
    "id": "abc123",
    "status": "completed",
    "url": "https://example.com",
    "persona": "Jana, 45...",
    "createdAt": 1709000000000,
    "completedAt": 1709000060000
  }
]
```

## Session Lifecycle

```
pending → running → completed
                  → failed
```

Sessions are stored in-memory with a 24-hour TTL. Cleanup runs every hour.

| Status | Description |
|--------|-------------|
| `pending` | Created, not yet started |
| `running` | Browser launched, executing steps |
| `completed` | All steps finished, reports available |
| `failed` | Error occurred during execution |

## Webhooks

If a `webhookUrl` is provided when creating a session, notifications are sent on status changes:

```json
{
  "sessionId": "abc123",
  "status": "running",
  "timestamp": 1709000001000
}
```

Webhook behavior:
- Sent on: `running`, `completed`, `failed`
- Method: `POST` with `Content-Type: application/json`
- Timeout: 5,000 ms per request
- Retry: 2 attempts with 2,000 ms delay
- Failures are logged but never block the session
