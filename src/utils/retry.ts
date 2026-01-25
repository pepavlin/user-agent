export type RetryOptions = {
  attempts?: number;
  delayMs?: number;
  backoff?: boolean;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  attempts: 3,
  delayMs: 1000,
  backoff: true,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> => {
  const { attempts, delayMs, backoff } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < attempts) {
        const delay = backoff ? delayMs * attempt : delayMs;
        await sleep(delay);
      }
    }
  }

  throw lastError;
};
