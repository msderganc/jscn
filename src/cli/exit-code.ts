import type { AnalysisResult } from "../core/schema.js";

const cleanExitCode = 0;
const qualityIssueExitCode = 1;
export const analysisFailureExitCode = 2;

export function exitCodeForResult(result: AnalysisResult): number {
  return result.summary.qualityIssueCount > 0 ? qualityIssueExitCode : cleanExitCode;
}
