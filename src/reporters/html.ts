import type { AnalysisResult, Issue } from "../core/schema.js";
import { writeReport } from "./write.js";

export function renderHtml(result: AnalysisResult): string {
  const issueRows = result.issues.map(renderIssueRow).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>jscn report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #171717; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d4d4d4; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>jscn ${escapeHtml(result.version)}</h1>
  <p>${result.summary.analyzedFiles} analyzed, ${result.summary.skippedFiles} skipped, ${result.summary.totalIssues} issues.</p>
  <table>
    <thead><tr><th>Severity</th><th>Analyzer</th><th>Location</th><th>Rule</th><th>Message</th></tr></thead>
    <tbody>
${issueRows}
    </tbody>
  </table>
</body>
</html>
`;
}

export function writeHtml(path: string, result: AnalysisResult): void {
  writeReport(path, renderHtml(result));
}

function renderIssueRow(issue: Issue): string {
  const location = issue.file
    ? [issue.file, issue.start?.line, issue.start?.column].filter((part) => part !== undefined).join(":")
    : "";
  return `      <tr><td>${escapeHtml(issue.severity)}</td><td>${escapeHtml(issue.analyzer)}</td><td>${escapeHtml(location)}</td><td>${escapeHtml(issue.rule)}</td><td>${escapeHtml(issue.message)}</td></tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
