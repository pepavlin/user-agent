#!/usr/bin/env node

import { Command } from 'commander';
import { runSession } from '../core/session.js';
import { createBrowserManager } from '../browser/index.js';
import { createLLMProvider, type LLMProviderType } from '../llm/index.js';
import { createMarkdownReportGenerator } from '../report/index.js';
import { createLogger, createCostTracker } from '../utils/index.js';
import { defaults } from '../config/defaults.js';
import { getPersonaPreset, listPersonaPresets, PERSONA_PRESETS } from '../config/personas.js';
import type { SessionConfig, Credentials } from '../core/types.js';
import type { DebugLevel } from '../utils/types.js';

const parseCredentials = (value: string): Credentials => {
  const credentials: Credentials = {};
  const pairs = value.split(',');
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      credentials[key.trim()] = valueParts.join('=').trim();
    }
  }
  return credentials;
};

const parseDebug = (value: string): DebugLevel => {
  if (value === 'ultra') return 'ultra';
  if (value === 'true' || value === 'debug') return 'debug';
  return false;
};

const program = new Command();

program
  .name('user-agent')
  .description('Simulate real human users to discover UX blind spots')
  .version('0.1.0');

// List personas command
program
  .command('personas')
  .description('List available persona presets')
  .action(() => {
    console.log('\n📋 Available persona presets:\n');
    for (const [key, preset] of Object.entries(PERSONA_PRESETS)) {
      console.log(`  ${key.padEnd(15)} - ${preset.name}`);
      console.log(`                    ${preset.description}`);
      console.log(`                    Example: --persona-preset ${key}\n`);
    }
    console.log('Use with: npm run dev -- --url <url> --persona-preset <key>\n');
  });

// Main run command (default)
program
  .command('run', { isDefault: true })
  .description('Run a UX testing session')
  .requiredOption('--url <url>', 'Target URL to test')
  .option('--persona <text>', 'Natural language user description')
  .option('--persona-preset <key>', 'Use predefined persona (run "personas" to see options)')
  .option('--intent <text>', 'What the user wants to achieve')
  .option('--explore', 'Enable exploratory mode (no specific intent)', false)
  .option('--steps <number>', 'Maximum number of steps', String(defaults.maxSteps))
  .option('--timeout <seconds>', 'Session timeout in seconds', String(defaults.timeout))
  .option('--wait <seconds>', 'Wait time between actions', String(defaults.waitBetweenActions))
  .option('--credentials <pairs>', 'Login credentials as "key=value,key=value"')
  .option('--output <path>', 'Output report path', defaults.outputPath)
  .option('--debug [level]', 'Debug mode (true, debug, or ultra)', 'false')
  .option('--budget <czk>', 'Maximum cost in CZK', '5')
  .option('--llm <provider>', 'LLM provider (claude, claude-cli, openai)', 'claude')
  .action(async (options) => {
    const debugLevel = parseDebug(options.debug);
    const logger = createLogger(debugLevel);

    try {
      // Resolve persona from preset or direct input
      let persona = options.persona;
      let intent = options.intent;

      if (options.personaPreset) {
        const preset = getPersonaPreset(options.personaPreset);
        if (!preset) {
          console.error(`❌ Unknown persona preset: ${options.personaPreset}`);
          console.error(`Available presets: ${listPersonaPresets().join(', ')}`);
          console.error('Run "npm run dev -- personas" to see all options');
          process.exit(1);
        }
        persona = preset.persona;
        // Use preset's first sample intent if no intent provided
        if (!intent && preset.sampleIntents.length > 0) {
          intent = preset.sampleIntents[0];
        }
        logger.info(`Using persona preset: ${preset.name}`);
      }

      if (!persona) {
        console.error('❌ Error: Either --persona or --persona-preset is required');
        console.error('Run "npm run dev -- personas" to see available presets');
        process.exit(1);
      }

      const config: SessionConfig = {
        url: options.url,
        persona: persona,
        intent: intent,
        explore: options.explore || !intent,
        maxSteps: parseInt(options.steps, 10),
        timeout: parseInt(options.timeout, 10),
        waitBetweenActions: parseInt(options.wait, 10),
        credentials: options.credentials ? parseCredentials(options.credentials) : undefined,
        outputPath: options.output,
        debug: debugLevel,
        budgetCZK: parseFloat(options.budget),
      };

      logger.info('UserAgent v0.1.0');
      logger.info('================');

      const browser = createBrowserManager();
      const llm = createLLMProvider(options.llm as LLMProviderType);
      const reportGenerator = createMarkdownReportGenerator();
      const costTracker = createCostTracker(config.budgetCZK, defaults.czkPerUsd);

      const report = await runSession(config, {
        llm,
        browser,
        logger,
        costTracker,
        reportGenerator,
      });

      logger.info('\n================');
      logger.info('Session complete!');
      logger.info(`Steps executed: ${report.summary.totalSteps}`);
      logger.info(`Intuitiveness score: ${report.summary.intuitivenessScore}/10`);
      logger.info(`Issues found: ${report.summary.issuesFound.length}`);
      logger.info(`Cost: $${report.cost.totalCostUSD.toFixed(4)} (${report.cost.totalCostCZK.toFixed(2)} CZK)`);
      logger.info(`Report: ${config.outputPath}`);

      process.exit(0);
    } catch (error) {
      logger.error('Session failed', error instanceof Error ? error : undefined);
      process.exit(1);
    }
  });

program.parse();
