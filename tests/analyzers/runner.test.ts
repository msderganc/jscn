import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseSelectedAnalyzers, runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("runAnalysis", () => {
  it("runs only selected complexity analysis", () => {
    const project = fixtureProject({ "src/a.ts": "export const a = () => true;\n" });
    const result = runAnalysis({
      project,
      config: defaultConfig,
      selectedAnalyzers: ["complexity"],
      generatedAt: "2026-01-01T00:00:00.000Z",
      startedAtMs: 0,
      endedAtMs: 5,
    });

    expect(result.analyses.complexity).toBeDefined();
    expect(result.analyses.dependencies).toBeUndefined();
    expect(result.durationMs).toBe(5);
  }, 15_000);

  it("runs dependency analysis and reports cycle issues", () => {
    const project = fixtureProject({
      "src/a.ts": "import './b';\n",
      "src/b.ts": "import './a';\n",
    });
    const result = runAnalysis({
      project,
      config: defaultConfig,
      selectedAnalyzers: ["deps"],
      generatedAt: "2026-01-01T00:00:00.000Z",
      startedAtMs: 0,
      endedAtMs: 5,
    });

    expect(result.analyses.dependencies?.cycles).toHaveLength(1);
    expect(result.summary.qualityIssueCount).toBe(1);
  });

  it("applies skip flags to selected analyzers", () => {
    expect(parseSelectedAnalyzers("complexity,deps", true, false)).toEqual(["deps"]);
    expect(parseSelectedAnalyzers("complexity,deps", false, true)).toEqual(["complexity"]);
  });
});

function fixtureProject(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "jscn-runner-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return discoverProject({ root });
}
