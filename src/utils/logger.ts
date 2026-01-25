import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Logger, DebugLevel } from './types.js';

export const createLogger = (debugLevel: DebugLevel): Logger => {
  const tmpDir = './tmp';
  const llmDir = join(tmpDir, 'llm-responses');
  const screenshotsDir = join(tmpDir, 'screenshots');

  const ensureDirs = async () => {
    if (debugLevel === 'ultra') {
      await mkdir(llmDir, { recursive: true });
      await mkdir(screenshotsDir, { recursive: true });
    }
  };

  const dirsCreated = ensureDirs();

  const timestamp = () => new Date().toISOString();

  const formatMessage = (level: string, message: string) =>
    `[${timestamp()}] [${level}] ${message}`;

  return {
    info(message: string) {
      console.log(formatMessage('INFO', message));
    },

    debug(message: string) {
      if (debugLevel === 'debug' || debugLevel === 'ultra') {
        console.log(formatMessage('DEBUG', message));
      }
    },

    error(message: string, error?: Error) {
      console.error(formatMessage('ERROR', message));
      if (error && (debugLevel === 'debug' || debugLevel === 'ultra')) {
        console.error(error.stack);
      }
    },

    step(stepNumber: number, message: string) {
      const prefix = `Step ${stepNumber}`;
      console.log(formatMessage(prefix, message));
    },

    async saveLLMResponse(stepNumber: number, type: string, data: unknown) {
      if (debugLevel !== 'ultra') return;

      await dirsCreated;
      const filename = `step-${String(stepNumber).padStart(3, '0')}-${type}.json`;
      const filepath = join(llmDir, filename);
      await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
    },

    async saveScreenshot(stepNumber: number, name: string, data: Buffer) {
      if (debugLevel !== 'ultra') return;

      await dirsCreated;
      const filename = `step-${String(stepNumber).padStart(3, '0')}-${name}.png`;
      const filepath = join(screenshotsDir, filename);
      await writeFile(filepath, data);
    },
  };
};
