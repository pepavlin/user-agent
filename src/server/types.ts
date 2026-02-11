import type { JsonReport } from '../report/index.js';

// Session lifecycle status
export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed';

// Live progress info for running sessions
export type SessionProgress = {
  currentStep: number;
  totalSteps: number;
  lastMessage: string;
};

// Internal session state stored in memory
export type SessionState = {
  id: string;
  status: SessionStatus;
  config: {
    url: string;
    persona: string;
    intent?: string;
    maxSteps: number;
    timeout: number;
    waitBetweenActions: number;
    budgetCZK: number;
    credentials?: Record<string, string>;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress?: SessionProgress;
  report?: string;
  jsonReport?: JsonReport;
  error?: string;
};

// POST /sessions request body
export type CreateSessionRequest = {
  url: string;
  persona: string;
  intent?: string;
  maxSteps?: number;
  timeout?: number;
  waitBetweenActions?: number;
  budgetCZK?: number;
  credentials?: Record<string, string>;
};

// POST /sessions response
export type CreateSessionResponse = {
  sessionId: string;
  status: SessionStatus;
};

// GET /sessions/:id response
export type GetSessionResponse = {
  id: string;
  status: SessionStatus;
  config: SessionState['config'];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress?: SessionProgress;
  report?: string;
  jsonReport?: JsonReport;
  error?: string;
};

// GET /sessions response (list, summary only)
export type SessionSummaryItem = {
  id: string;
  status: SessionStatus;
  url: string;
  persona: string;
  createdAt: number;
  completedAt?: number;
};

// GET /health response
export type HealthResponse = {
  status: 'ok';
  version: string;
  uptime: number;
};

// Error response
export type ErrorResponse = {
  error: string;
};
