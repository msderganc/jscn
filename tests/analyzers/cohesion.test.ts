import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("cohesion analyzer", () => {
  it("reports LCOM-style cohesion and accepts lcom alias", () => {
    const root = createProject({ "src/a.ts": "class Service { run() { return 1; } }\n" });
    const result = runAnalysis({ project: discoverProject({ root }), config: defaultConfig, selectedAnalyzers: ["lcom"], generatedAt: "now", startedAtMs: 0, endedAtMs: 1 });

    expect(result.analyses.cohesion?.classes).toEqual([expect.objectContaining({ name: "Service", lcom: 1 })]);
    expect(result.issues[0]).toMatchObject({ analyzer: "cohesion", rule: "cohesion.lcom" });
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-cohesion-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
