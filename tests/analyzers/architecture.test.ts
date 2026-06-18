import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("architecture analyzer", () => {
  it("reports forbidden domain to infra imports", () => {
    const root = createProject({
      "src/domain/service.ts": "import '../infra/db';\nexport const service = true;\n",
      "src/infra/db.ts": "export const db = true;\n",
    });
    const result = runAnalysis({ project: discoverProject({ root }), config: defaultConfig, selectedAnalyzers: ["architecture"], generatedAt: "now", startedAtMs: 0, endedAtMs: 1 });

    expect(result.analyses.architecture?.violations).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ analyzer: "architecture", rule: "architecture.forbidden_import" });
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-architecture-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
