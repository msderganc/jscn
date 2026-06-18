import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("clone analyzer", () => {
  it("detects deterministic duplicate chunks across files", () => {
    const duplicate = "export function duplicated(value: string) { if (value) return value.trim().toLowerCase(); return 'missing'; }\n";
    const root = createProject({ "src/a.ts": duplicate, "src/b.ts": duplicate });
    const result = runAnalysis({ project: discoverProject({ root }), config: defaultConfig, selectedAnalyzers: ["clones"], generatedAt: "now", startedAtMs: 0, endedAtMs: 1 });

    expect(result.analyses.clones?.groups).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ analyzer: "clones", rule: "clones.duplicate" });
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-clones-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
