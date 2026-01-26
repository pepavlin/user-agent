import { writeFile } from 'fs/promises';
import type { ReportGenerator } from './types.js';
import type { SessionReport, StepResult, EvaluationResult } from '../core/types.js';

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
};

const formatTimestamp = (ts: number): string => {
  return new Date(ts).toISOString();
};

const evaluationEmoji = (result: EvaluationResult): string => {
  switch (result) {
    case 'met':
      return '\u2705'; // checkmark
    case 'unmet':
      return '\u274C'; // x
    case 'partial':
      return '\u26A0\uFE0F'; // warning
    case 'surprised':
      return '\u2753'; // question mark
  }
};

const formatStep = (step: StepResult): string => {
  const lines: string[] = [];

  lines.push(`## Step ${step.stepNumber}`);
  lines.push('');
  lines.push(`**Saw:** ${step.analysis.description}`);
  lines.push('');
  lines.push(`**Expected:** "${step.expectation.what}"`);
  if (step.expectation.expectedTime) {
    lines.push(`(Expected time: ${step.expectation.expectedTime})`);
  }
  lines.push('');
  lines.push(`**Action:** ${step.action.action}${step.action.elementId ? ` on [${step.action.elementId}]` : ''}`);
  lines.push(`*Reasoning:* ${step.action.reasoning}`);
  lines.push('');
  lines.push(`**Result:** ${step.evaluation.reality}`);
  lines.push('');
  lines.push(`**Evaluation:** ${evaluationEmoji(step.evaluation.result)} ${step.evaluation.result.toUpperCase()}`);
  lines.push('');

  if (step.evaluation.notes.length > 0) {
    lines.push('**Notes:**');
    step.evaluation.notes.forEach((note) => {
      lines.push(`- ${note}`);
    });
    lines.push('');
  }

  if (step.evaluation.userQuote) {
    lines.push(`> "${step.evaluation.userQuote}"`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
};

const formatQuickSummary = (steps: StepResult[]): string => {
  const lines: string[] = [];
  lines.push('## Quick Overview');
  lines.push('');
  lines.push('| # | Action | What | Result |');
  lines.push('|---|--------|------|--------|');

  steps.forEach((step) => {
    // Extract brief target description
    let target = '';
    if (step.action.action === 'type' && step.action.value) {
      target = `"${step.action.value.substring(0, 20)}${step.action.value.length > 20 ? '...' : ''}"`;
    } else if (step.action.elementId) {
      // Try to get element name from analysis
      const elementMatch = step.analysis.mainElements.find(el =>
        el.toLowerCase().includes('search') ||
        el.toLowerCase().includes('button') ||
        el.toLowerCase().includes('link')
      );
      target = elementMatch ? elementMatch.substring(0, 25) : step.action.elementId;
    }

    // Get brief reason (first meaningful phrase)
    const reasoning = step.action.reasoning || '';
    const shortReason = reasoning.split(/[,.!?]/)[0].substring(0, 35);

    const resultIcon = step.evaluation.result === 'met' ? '✅' :
      step.evaluation.result === 'unmet' ? '❌' :
      step.evaluation.result === 'partial' ? '⚠️' : '❓';

    lines.push(`| ${step.stepNumber} | ${step.action.action} | ${target || shortReason}${shortReason.length >= 35 ? '...' : ''} | ${resultIcon} |`);
  });

  lines.push('');
  return lines.join('\n');
};

const generateMarkdown = (report: SessionReport, videoPath?: string): string => {
  const lines: string[] = [];
  const duration = report.endTime - report.startTime;

  // Header
  lines.push('# UserAgent Session Report');
  lines.push('');

  // Session Info
  lines.push('## Session Info');
  lines.push('');
  lines.push(`- **URL:** ${report.config.url}`);
  lines.push(`- **Persona:** ${report.config.persona}`);
  if (report.config.intent) {
    lines.push(`- **Intent:** ${report.config.intent}`);
  } else {
    lines.push(`- **Mode:** Exploratory`);
  }
  lines.push(`- **Started:** ${formatTimestamp(report.startTime)}`);
  lines.push(`- **Duration:** ${formatDuration(duration)}`);
  lines.push(`- **Steps:** ${report.summary.totalSteps}`);
  if (videoPath) {
    lines.push(`- **Video:** [${videoPath}](${videoPath})`);
  }
  lines.push('');

  // Quick Overview (one line per step)
  lines.push(formatQuickSummary(report.steps));

  // Timeline
  lines.push('# Timeline');
  lines.push('');
  report.steps.forEach((step) => {
    lines.push(formatStep(step));
  });

  // Summary
  lines.push('# Summary');
  lines.push('');
  lines.push(`**Intuitiveness Score:** ${report.summary.intuitivenessScore}/10`);
  lines.push('');

  if (report.summary.issuesFound.length > 0) {
    lines.push('## Issues Found');
    lines.push('');
    report.summary.issuesFound.forEach((issue) => {
      lines.push(`- ${issue}`);
    });
    lines.push('');
  }

  if (report.summary.improvements.length > 0) {
    lines.push('## Improvement Suggestions');
    lines.push('');
    report.summary.improvements.forEach((improvement) => {
      lines.push(`- ${improvement}`);
    });
    lines.push('');
  }

  if (report.summary.userQuotes.length > 0) {
    lines.push('## User Perspective');
    lines.push('');
    report.summary.userQuotes.forEach((quote) => {
      lines.push(`> "${quote}"`);
      lines.push('');
    });
  }

  // Cost
  lines.push('## Session Cost');
  lines.push('');
  lines.push(`- **Input tokens:** ${report.cost.inputTokens.toLocaleString()}`);
  lines.push(`- **Output tokens:** ${report.cost.outputTokens.toLocaleString()}`);
  lines.push(`- **Total cost:** $${report.cost.totalCostUSD.toFixed(4)} (${report.cost.totalCostCZK.toFixed(2)} CZK)`);
  lines.push('');

  // Key Metrics
  const metCount = report.steps.filter(s => s.evaluation.result === 'met').length;
  const unmetCount = report.steps.filter(s => s.evaluation.result === 'unmet').length;
  const partialCount = report.steps.filter(s => s.evaluation.result === 'partial').length;

  lines.push('## Key Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Expectations Met | ${metCount}/${report.steps.length} (${Math.round(metCount/report.steps.length*100)}%) |`);
  lines.push(`| Expectations Unmet | ${unmetCount}/${report.steps.length} |`);
  lines.push(`| Partial Success | ${partialCount}/${report.steps.length} |`);
  lines.push(`| Issues Identified | ${report.summary.issuesFound.length} |`);
  lines.push(`| Suggestions Generated | ${report.summary.improvements.length} |`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('*Generated by [UserAgent](https://github.com/yourusername/user-agent)*');

  return lines.join('\n');
};

export const createMarkdownReportGenerator = (): ReportGenerator => {
  let videoPath: string | undefined;

  return {
    setVideoPath(path: string) {
      videoPath = path;
    },

    generate(report: SessionReport): string {
      return generateMarkdown(report, videoPath);
    },

    async save(report: SessionReport, outputPath: string): Promise<void> {
      const markdown = generateMarkdown(report, videoPath);
      await writeFile(outputPath, markdown, 'utf-8');
    },
  };
};
