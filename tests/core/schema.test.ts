import { describe, expect, it } from "vitest";

import { createAnalysisResult, createEmptySummary, summarizeIssues } from "../../src/core/result.js";
import { isSeverity } from "../../src/core/severity.js";
import type { Issue } from "../../src/core/schema.js";

describe("canonical schema helpers", () => {
  it("creates an empty summary", () => {
    expect(createEmptySummary()).toEqual({
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
    });
  });

  it("summarizes issues by severity", () => {
    const issues: Issue[] = [
      issue("info", "info-1"),
      issue("warning", "warning-1"),
      issue("critical", "critical-1")
    ];

    expect(summarizeIssues(issues)).toMatchObject({
      totalIssues: 3,
      issueCounts: {
        info: 1,
        warning: 1,
        error: 0,
        critical: 1
      },
      qualityIssueCount: 2
    });
  });

  it("creates an analysis result with aggregate summary", () => {
    const result = createAnalysisResult({
      version: "0.1.2",
      generatedAt: "2026-06-18T00:00:00.000Z",
      durationMs: 12,
      root: "/repo",
      issues: [issue("error", "error-1")],
      summary: {
        totalFiles: 2,
        analyzedFiles: 1,
        skippedFiles: 1
      }
    });

    expect(result).toMatchObject({
      version: "0.1.2",
      durationMs: 12,
      root: "/repo",
      summary: {
        totalFiles: 2,
        analyzedFiles: 1,
        skippedFiles: 1,
        totalIssues: 1,
        qualityIssueCount: 1
      }
    });
  });

  it("recognizes valid severity values", () => {
    expect(isSeverity("warning")).toBe(true);
    expect(isSeverity("fatal")).toBe(false);
  });
});

function issue(severity: Issue["severity"], id: string): Issue {
  return {
    id,
    analyzer: "test",
    severity,
    message: id,
    rule: "test-rule"
  };
}
