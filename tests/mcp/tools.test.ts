import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAnalysisResult } from "../../src/core/result.js";
import { healthScore, listTools, runTool } from "../../src/mcp/tools.js";

describe("MCP tools", () => {
  it("defines analyzer tools and computes health score", () => {
    expect(listTools().map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["jscn_analysis", "jscn_complexity", "jscn_deps", "jscn_clones", "jscn_coupling", "jscn_cohesion", "jscn_deadcode", "jscn_architecture", "jscn_di", "jscn_mockdata", "jscn_health"])
    );
    expect(
      healthScore(
        createAnalysisResult({
          version: "0.1.2",
          generatedAt: "now",
          durationMs: 1,
          root: "/repo",
          issues: [{ id: "w", analyzer: "x", severity: "warning", message: "warning", rule: "x" }],
        })
      )
    ).toMatchObject({ score: 95, grade: "A" });
  });

  it("runs analysis and rejects outside paths", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-mcp-"));
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src/a.ts"), "export const a = true;\n", "utf8");

    expect(runTool("jscn_complexity", { root, files: ["src"] })).toMatchObject({ analyses: { complexity: expect.any(Object) } });
    expect(() => runTool("jscn_complexity", { root, files: ["../outside.ts"] })).toThrow("Path is outside");
  }, 15_000);
});
