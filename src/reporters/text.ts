import type { AnalysisResult } from "../core/schema.js";

export function renderText(result: AnalysisResult): string {
  const lines = [
    `jscn ${result.version}`,
    `Files: ${result.summary.analyzedFiles} analyzed, ${result.summary.skippedFiles} skipped`,
    `Issues: ${result.summary.totalIssues}`,
  ];

  const complexity = result.analyses.complexity;
  if (complexity) {
    lines.push(`Complexity: ${complexity.functions.length} functions, max ${complexity.maxComplexity}`);
  }

  for (const issue of result.issues) {
    lines.push(`${issue.severity.toUpperCase()} ${issue.file ?? ""}:${issue.start?.line ?? 0} ${issue.message}`.trim());
  }

  return `${lines.join("\n")}\n`;
}
