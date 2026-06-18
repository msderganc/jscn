import type { AnalysisResult, Issue } from "../core/schema.js";
import { writeReport } from "./write.js";

const issueHeaders = ["id", "analyzer", "severity", "file", "line", "column", "rule", "message"] as const;

export function renderCsv(result: AnalysisResult): string {
  const rows = [
    issueHeaders.join(","),
    ...result.issues.map((issue) =>
      [
        issue.id,
        issue.analyzer,
        issue.severity,
        issue.file ?? "",
        issue.start?.line ?? "",
        issue.start?.column ?? "",
        issue.rule,
        issue.message,
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  return `${rows.join("\n")}\n`;
}

export function writeCsv(path: string, result: AnalysisResult): void {
  writeReport(path, renderCsv(result));
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
