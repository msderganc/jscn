import { createAnalysisResult } from "../../src/core/result.js";
import type { AnalysisResult } from "../../src/core/schema.js";

export function sampleResult(): AnalysisResult {
  return createAnalysisResult({
    version: "0.1.2",
    generatedAt: "2026-01-01T00:00:00.000Z",
    durationMs: 12,
    root: "/repo",
    issues: [
      {
        id: "complexity:high:src/a.ts:1",
        analyzer: "complexity",
        severity: "warning",
        file: "src/a.ts",
        start: { line: 1, column: 2, offset: 1 },
        rule: "complexity.max_complexity",
        message: "unsafe <script>alert(1)</script>, value",
        details: { score: 12 },
      },
    ],
    summary: { totalFiles: 1, analyzedFiles: 1, skippedFiles: 0 },
  });
}
