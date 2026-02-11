import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'crypto';
import { runSession } from '../core/session.js';
import { createBrowserManager } from '../browser/index.js';
import { createLLMProvider, type LLMProviderType } from '../llm/index.js';
import { createMarkdownReportGenerator } from '../report/index.js';
import { buildJsonReport } from '../report/json.js';
import { createLogger, createCostTracker } from '../utils/index.js';
import { defaults } from '../config/defaults.js';
import type { SessionConfig } from '../core/types.js';
import type {
  SessionState,
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionResponse,
  SessionSummaryItem,
  HealthResponse,
  ErrorResponse,
} from './types.js';

const VERSION = '0.1.0';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory session storage
const sessions = new Map<string, SessionState>();

// Cleanup expired sessions every hour
const startCleanupInterval = (): NodeJS.Timeout => {
  return setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      const isTerminal = session.status === 'completed' || session.status === 'failed';
      const age = now - session.createdAt;
      if (isTerminal && age > SESSION_TTL_MS) {
        sessions.delete(id);
      }
    }
  }, 60 * 60 * 1000);
};

// Execute session in background (fire-and-forget)
const executeSession = async (sessionId: string): Promise<void> => {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.status = 'running';
  session.startedAt = Date.now();

  const config: SessionConfig = {
    url: session.config.url,
    persona: session.config.persona,
    intent: session.config.intent,
    explore: !session.config.intent,
    maxSteps: session.config.maxSteps,
    timeout: session.config.timeout,
    waitBetweenActions: session.config.waitBetweenActions,
    credentials: session.config.credentials,
    outputPath: `./tmp/reports/${sessionId}.md`,
    jsonOutputPath: `./tmp/reports/${sessionId}.json`,
    debug: false,
    budgetCZK: session.config.budgetCZK,
  };

  const browser = createBrowserManager();
  const llmType = (process.env.LLM_PROVIDER || 'claude') as LLMProviderType;
  const llm = createLLMProvider(llmType);
  const reportGenerator = createMarkdownReportGenerator();
  const costTracker = createCostTracker(config.budgetCZK, defaults.czkPerUsd);
  const logger = createLogger(false);

  try {
    const report = await runSession(config, {
      llm,
      browser,
      logger,
      costTracker,
      reportGenerator,
    });

    session.status = 'completed';
    session.completedAt = Date.now();
    session.report = reportGenerator.generate(report);
    session.jsonReport = buildJsonReport(report);
  } catch (error) {
    session.status = 'failed';
    session.completedAt = Date.now();
    session.error = error instanceof Error ? error.message : String(error);
  }
};

// Validate request body
const validateCreateRequest = (body: unknown): { valid: true; data: CreateSessionRequest } | { valid: false; error: string } => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.url !== 'string' || !b.url.trim()) {
    return { valid: false, error: 'Field "url" is required and must be a non-empty string' };
  }

  if (typeof b.persona !== 'string' || !b.persona.trim()) {
    return { valid: false, error: 'Field "persona" is required and must be a non-empty string' };
  }

  try {
    new URL(b.url);
  } catch {
    return { valid: false, error: 'Field "url" must be a valid URL' };
  }

  if (b.intent !== undefined && typeof b.intent !== 'string') {
    return { valid: false, error: 'Field "intent" must be a string' };
  }

  if (b.maxSteps !== undefined && (typeof b.maxSteps !== 'number' || b.maxSteps < 1 || b.maxSteps > 50)) {
    return { valid: false, error: 'Field "maxSteps" must be a number between 1 and 50' };
  }

  if (b.timeout !== undefined && (typeof b.timeout !== 'number' || b.timeout < 10 || b.timeout > 3600)) {
    return { valid: false, error: 'Field "timeout" must be a number between 10 and 3600' };
  }

  if (b.waitBetweenActions !== undefined && (typeof b.waitBetweenActions !== 'number' || b.waitBetweenActions < 1 || b.waitBetweenActions > 60)) {
    return { valid: false, error: 'Field "waitBetweenActions" must be a number between 1 and 60' };
  }

  if (b.budgetCZK !== undefined && (typeof b.budgetCZK !== 'number' || b.budgetCZK < 1)) {
    return { valid: false, error: 'Field "budgetCZK" must be a number >= 1' };
  }

  if (b.credentials !== undefined && (typeof b.credentials !== 'object' || b.credentials === null || Array.isArray(b.credentials))) {
    return { valid: false, error: 'Field "credentials" must be an object with string values' };
  }

  return {
    valid: true,
    data: {
      url: b.url as string,
      persona: b.persona as string,
      intent: b.intent as string | undefined,
      maxSteps: b.maxSteps as number | undefined,
      timeout: b.timeout as number | undefined,
      waitBetweenActions: b.waitBetweenActions as number | undefined,
      budgetCZK: b.budgetCZK as number | undefined,
      credentials: b.credentials as Record<string, string> | undefined,
    },
  };
};

// Create and configure the Fastify server
export const createServer = () => {
  const apiKey = process.env.API_KEY;

  const server = Fastify({ logger: true });

  // Register CORS
  server.register(cors);

  // Auth hook for protected routes
  const authenticate = (request: { headers: Record<string, string | string[] | undefined> }): boolean => {
    if (!apiKey) return true; // No API_KEY set = no auth required

    const xApiKey = request.headers['x-api-key'];
    if (xApiKey === apiKey) return true;

    const authHeader = request.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ') && authHeader.slice(7) === apiKey) {
      return true;
    }

    return false;
  };

  // GET /health — no auth required
  server.get<{ Reply: HealthResponse }>('/health', async () => {
    return {
      status: 'ok',
      version: VERSION,
      uptime: process.uptime(),
    };
  });

  // POST /sessions — create a new session
  server.post<{ Body: CreateSessionRequest; Reply: CreateSessionResponse | ErrorResponse }>('/sessions', async (request, reply) => {
    if (!authenticate(request)) {
      return reply.status(401).send({ error: 'Unauthorized. Provide X-API-Key header or Authorization: Bearer token.' });
    }

    const validation = validateCreateRequest(request.body);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.error });
    }

    const { data } = validation;
    const sessionId = randomUUID();

    const state: SessionState = {
      id: sessionId,
      status: 'pending',
      config: {
        url: data.url,
        persona: data.persona,
        intent: data.intent,
        maxSteps: data.maxSteps ?? defaults.maxSteps,
        timeout: data.timeout ?? defaults.timeout,
        waitBetweenActions: data.waitBetweenActions ?? defaults.waitBetweenActions,
        budgetCZK: data.budgetCZK ?? defaults.budgetCZK,
        credentials: data.credentials,
      },
      createdAt: Date.now(),
    };

    sessions.set(sessionId, state);

    // Fire and forget — session runs in background
    executeSession(sessionId).catch(() => {
      // Error already stored in session state
    });

    return reply.status(201).send({
      sessionId,
      status: 'pending',
    });
  });

  // GET /sessions/:id — get session status and results
  server.get<{ Params: { id: string }; Reply: GetSessionResponse | ErrorResponse }>('/sessions/:id', async (request, reply) => {
    if (!authenticate(request)) {
      return reply.status(401).send({ error: 'Unauthorized. Provide X-API-Key header or Authorization: Bearer token.' });
    }

    const session = sessions.get(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const response: GetSessionResponse = {
      id: session.id,
      status: session.status,
      config: session.config,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      report: session.report,
      jsonReport: session.jsonReport,
      error: session.error,
    };

    return response;
  });

  // GET /sessions — list all sessions (summary only)
  server.get<{ Reply: SessionSummaryItem[] | ErrorResponse }>('/sessions', async (request, reply) => {
    if (!authenticate(request)) {
      return reply.status(401).send({ error: 'Unauthorized. Provide X-API-Key header or Authorization: Bearer token.' });
    }

    const summaries: SessionSummaryItem[] = [];
    for (const session of sessions.values()) {
      summaries.push({
        id: session.id,
        status: session.status,
        url: session.config.url,
        persona: session.config.persona,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      });
    }

    // Sort by creation time, newest first
    summaries.sort((a, b) => b.createdAt - a.createdAt);

    return summaries;
  });

  return server;
};

// Start the server when run directly
const start = async () => {
  const port = parseInt(process.env.PORT || '3000', 10);

  if (!process.env.API_KEY) {
    console.warn('WARNING: API_KEY not set. Endpoints will be unauthenticated.');
  }

  const server = createServer();
  const cleanupInterval = startCleanupInterval();

  // Graceful shutdown
  const shutdown = async () => {
    clearInterval(cleanupInterval);
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`UserAgent API server v${VERSION} listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
