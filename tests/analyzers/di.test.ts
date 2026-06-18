import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("DI analyzer", () => {
  it("reports container lookups outside composition roots", () => {
    const root = createProject({
      "src/service.ts": "container.get('db');\n",
      "src/main.ts": "container.get('db');\n",
    });
    const result = runAnalysis({ project: discoverProject({ root }), config: defaultConfig, selectedAnalyzers: ["di"], generatedAt: "now", startedAtMs: 0, endedAtMs: 1 });

    expect(result.analyses.di?.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ analyzer: "di", file: "src/service.ts" });
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-di-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
