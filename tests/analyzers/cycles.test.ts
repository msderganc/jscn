import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeDependencies } from "../../src/analyzers/dependencies.js";
import { discoverProject } from "../../src/project/discover.js";

describe("dependency cycles", () => {
  it("detects runtime cycles", () => {
    const root = createProject({
      "src/a.ts": "import './b';\n",
      "src/b.ts": "import './a';\n",
    });

    const report = analyzeDependencies(discoverProject({ root }), { includeTypeOnly: false, includeExternal: false });

    expect(report.cycles).toHaveLength(1);
    expect(report.cycles[0]?.files).toEqual(["src/a.ts", "src/b.ts", "src/a.ts"]);
    expect(report.cycles[0]?.edgeKinds).toEqual(["runtime", "runtime"]);
  }, 15_000);

  it("ignores type-only cycles unless configured", () => {
    const root = createProject({
      "src/a.ts": "import type { B } from './b';\nexport interface A { b: B }\n",
      "src/b.ts": "import type { A } from './a';\nexport interface B { a: A }\n",
    });

    expect(analyzeDependencies(discoverProject({ root }), { includeTypeOnly: false, includeExternal: false }).cycles).toHaveLength(0);
    expect(analyzeDependencies(discoverProject({ root }), { includeTypeOnly: true, includeExternal: false }).cycles).toHaveLength(1);
  });

  it("ignores specifier-level type-only cycles unless configured", () => {
    const root = createProject({
      "src/a.ts": "import { type B } from './b';\nexport interface A { b: B }\n",
      "src/b.ts": "export type { A } from './a';\nexport interface B { value: string }\n",
    });

    expect(analyzeDependencies(discoverProject({ root }), { includeTypeOnly: false, includeExternal: false }).cycles).toHaveLength(0);
    expect(analyzeDependencies(discoverProject({ root }), { includeTypeOnly: true, includeExternal: false }).cycles).toHaveLength(1);
  });
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-cycles-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
