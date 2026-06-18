import type { AnalysisResult, AnalysisSummary, Issue } from "./schema.js";
import { type Severity, severityLevels } from "./severity.js";

export function createEmptySummary(): AnalysisSummary {
  return {
    totalFiles: 0,
    analyzedFiles: 0,
    skippedFiles: 0,
    totalIssues: 0,
    issueCounts: {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    },
    qualityIssueCount: 0
  };
}

export function summarizeIssues(issues: Issue[], base: Partial<AnalysisSummary> = {}): AnalysisSummary {
  const summary = { ...createEmptySummary(), ...base };

  for (const issue of issues) {
    summary.issueCounts[issue.severity] += 1;
  }

  summary.totalIssues = issues.length;
  summary.qualityIssueCount = countQualityIssues(summary.issueCounts);
  return summary;
}

export function createAnalysisResult(input: {
  version: string;
  generatedAt: string;
  durationMs: number;
  root: string;
  configPath?: string;
  issues?: Issue[];
  summary?: Partial<AnalysisSummary>;
  analyses?: AnalysisResult["analyses"];
}): AnalysisResult {
  const issues = input.issues ?? [];
  return {
    version: input.version,
    generatedAt: input.generatedAt,
    durationMs: input.durationMs,
    root: input.root,
    configPath: input.configPath,
    summary: summarizeIssues(issues, input.summary),
    issues,
    analyses: input.analyses ?? {}
  };
}

function countQualityIssues(counts: Record<Severity, number>): number {
  return severityLevels
    .filter((severity) => severity !== "info")
    .reduce((total, severity) => total + counts[severity], 0);
}
