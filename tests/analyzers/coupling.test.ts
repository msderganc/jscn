import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("coupling analyzer", () => {
  it("reports fan-in and fan-out from the dependency graph and accepts cbo alias", () => {
    const root = createProject({
      "src/a.ts": "import './b';\nimport './c';\n",
      "src/b.ts": "export const b = 1;\n",
      "src/c.ts": "export const c = 1;\n",
    });
    const result = runAnalysis({ project: discoverProject({ root }), config: defaultConfig, selectedAnalyzers: ["cbo"], generatedAt: "now", startedAtMs: 0, endedAtMs: 1 });

    expect(result.analyses.coupling?.modules).toEqual(
      expect.arrayContaining([expect.objectContaining({ file: "src/a.ts", fanOut: 2 }), expect.objectContaining({ file: "src/b.ts", fanIn: 1 })])
    );
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-coupling-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
