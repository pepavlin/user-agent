import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'crypto';
import { runSession } from '../core/session.js';
import { createBrowserManager } from '../browser/index.js';
import { createLLMProvider, type LLMProviderType } from '../llm/index.js';
import { createMarkdownReportGenerator } from '../report/index.js';
import { buildJsonReport } from '../report/json.js';
import { createLogger, createCostTracker } from '../utils/index.js';
import { defaults } from '../config/defaults.js';
import type { SessionConfig } from '../core/types.js';
import type { Logger } from '../utils/types.js';
import type {
  SessionState,
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionResponse,
  SessionSummaryItem,
  HealthResponse,
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
    outputPath: `/tmp/${sessionId}.md`,
    debug: false,
    budgetCZK: session.config.budgetCZK,
  };

  const browser = createBrowserManager();
  const llmType = (process.env.LLM_PROVIDER || 'claude') as LLMProviderType;
  const llm = createLLMProvider(llmType);
  const reportGenerator = createMarkdownReportGenerator();
  const costTracker = createCostTracker(config.budgetCZK, defaults.czkPerUsd);
  const baseLogger = createLogger(false);

  // Wrap logger to capture live progress into session state
  session.progress = { currentStep: 0, totalSteps: session.config.maxSteps, lastMessage: 'Starting session...' };
  const logger: Logger = {
    ...baseLogger,
    info(message: string) {
      baseLogger.info(message);
      session.progress!.lastMessage = message;
    },
    step(stepNumber: number, message: string) {
      baseLogger.step(stepNumber, message);
      session.progress!.currentStep = stepNumber;
      session.progress!.lastMessage = message;
    },
    error(message: string, error?: Error) {
      baseLogger.error(message, error);
      session.progress!.lastMessage = `Error: ${message}`;
    },
  };

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

// --- JSON Schemas for Swagger ---

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

const healthSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok'] },
    version: { type: 'string' },
    uptime: { type: 'number', description: 'Server uptime in seconds' },
  },
} as const;

const createSessionBodySchema = {
  type: 'object',
  required: ['url', 'persona'],
  properties: {
    url: { type: 'string', format: 'uri', description: 'Target URL to test' },
    persona: { type: 'string', description: 'Natural language user persona description' },
    intent: { type: 'string', description: 'What the user wants to achieve (omit for exploratory mode)' },
    maxSteps: { type: 'integer', minimum: 1, maximum: 50, default: 10, description: 'Maximum number of interaction steps' },
    timeout: { type: 'integer', minimum: 10, maximum: 3600, default: 300, description: 'Session timeout in seconds' },
    waitBetweenActions: { type: 'integer', minimum: 1, maximum: 60, default: 3, description: 'Wait time between actions in seconds' },
    budgetCZK: { type: 'number', minimum: 1, default: 5, description: 'Maximum cost in CZK before stopping' },
    credentials: { type: 'object', additionalProperties: { type: 'string' }, description: 'Login credentials as key-value pairs' },
  },
} as const;

const createSessionResponseSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['pending'] },
  },
} as const;

const sessionSummaryItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
    url: { type: 'string' },
    persona: { type: 'string' },
    createdAt: { type: 'integer', description: 'Unix timestamp in milliseconds' },
    completedAt: { type: 'integer', description: 'Unix timestamp in milliseconds' },
  },
} as const;

// Create and configure the Fastify server
export const createServer = async () => {
  const apiKey = process.env.API_KEY;

  const server = Fastify({ logger: true, trustProxy: true });

  // Register Swagger (OpenAPI spec generation)
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'UserAgent API',
        description: 'UX research automation — simulate real human users interacting with web applications. Sessions run asynchronously; poll for results.',
        version: VERSION,
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API key passed via X-API-Key header',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'API key passed via Authorization: Bearer header',
          },
        },
      },
    },
  });

  // Register Swagger UI dashboard
  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      tryItOutEnabled: true,
    },
  });

  // Register CORS
  await server.register(cors);

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
  server.get('/health', {
    schema: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Returns server status, version, and uptime. No authentication required.',
      response: {
        200: healthSchema,
      },
    },
  }, async () => {
    return {
      status: 'ok',
      version: VERSION,
      uptime: process.uptime(),
    } satisfies HealthResponse;
  });

  // POST /sessions — create a new session
  server.post('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'Start a new UX testing session',
      description: 'Creates a new session that runs in the background. Returns immediately with a session ID. Poll GET /sessions/:id for results.',
      security: [{ apiKey: [] }, { bearerAuth: [] }],
      body: {
        content: {
          'application/json': {
            schema: createSessionBodySchema,
            examples: {
              basic: {
                summary: 'Basic session',
                value: {
                  url: 'https://spotify.com',
                  persona: 'Jana, 45 let. Nikdy nepouzila Spotify.',
                  intent: 'Find relaxing music',
                },
              },
              full: {
                summary: 'Full config',
                value: {
                  url: 'https://example.com/login',
                  persona: 'Viktor, 22 let. Pouziva internet denne.',
                  intent: 'Log in and check profile',
                  maxSteps: 15,
                  timeout: 600,
                  budgetCZK: 10,
                  credentials: { email: 'user@example.com', password: 'secret' },
                },
              },
            },
          },
        },
      },
      response: {
        201: createSessionResponseSchema,
        400: errorSchema,
        401: errorSchema,
      },
    },
  }, async (request, reply) => {
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
    } satisfies CreateSessionResponse);
  });

  // GET /sessions/:id — get session status and results
  server.get<{ Params: { id: string } }>('/sessions/:id', {
    schema: {
      tags: ['Sessions'],
      summary: 'Get session status and results',
      description: 'Returns session status, config, and results. The report and jsonReport fields are populated when the session completes.',
      security: [{ apiKey: [] }, { bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Session ID' },
        },
        required: ['id'],
      },
      response: {
        // No 200 schema — Fastify's serializer would strip nested jsonReport fields
        401: errorSchema,
        404: errorSchema,
      },
    },
  }, async (request, reply) => {
    if (!authenticate(request)) {
      return reply.status(401).send({ error: 'Unauthorized. Provide X-API-Key header or Authorization: Bearer token.' });
    }

    const session = sessions.get(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return {
      id: session.id,
      status: session.status,
      config: session.config,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      progress: session.progress,
      report: session.report,
      jsonReport: session.jsonReport,
      error: session.error,
    } satisfies GetSessionResponse;
  });

  // GET /sessions — list all sessions (summary only)
  server.get('/sessions', {
    schema: {
      tags: ['Sessions'],
      summary: 'List all sessions',
      description: 'Returns a summary list of all sessions, sorted by creation time (newest first). Does not include full reports.',
      security: [{ apiKey: [] }, { bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: sessionSummaryItemSchema,
        },
        401: errorSchema,
      },
    },
  }, async (request, reply) => {
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

  const server = await createServer();
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
    console.log(`Swagger UI available at http://localhost:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
