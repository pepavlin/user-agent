import type { SessionReport } from '../core/types.js';

// Report generator type
export type ReportGenerator = {
  setVideoPath(path: string): void;
  generate(report: SessionReport): string;
  save(report: SessionReport, outputPath: string): Promise<void>;
};
