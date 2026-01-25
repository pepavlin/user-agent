import type { SessionReport } from '../core/types.js';

// Report generator type
export type ReportGenerator = {
  generate(report: SessionReport): string;
  save(report: SessionReport, outputPath: string): Promise<void>;
};
