import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("mock-data analyzer", () => {
  it("reports fake literals in production paths and ignores test paths", () => {
    const root = createProject({
      "src/user.ts": "export const email = 'test@example.com';\n",
      "src/user.test.ts": "export const email = 'test@example.com';\n",
      "src/server/data/__tests__/fixtures.ts": "export const email = 'test@example.com';\n",
      "src/server/data/__fixtures__/users.ts": "export const email = 'test@example.com';\n",
      "tests/user.ts": "export const email = 'test@example.com';\n",
    });
    const result = runAnalysis({ project: discoverProject({ root }), config: defaultConfig, selectedAnalyzers: ["mockdata"], generatedAt: "now", startedAtMs: 0, endedAtMs: 1 });

    expect(result.analyses.mockData?.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ analyzer: "mockdata", file: "src/user.ts" });
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-mock-data-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
