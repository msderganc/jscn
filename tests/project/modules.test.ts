import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProject } from "../../src/project/discover.js";
import { buildModuleModel } from "../../src/project/modules.js";
import { buildSymbolModel } from "../../src/project/symbols.js";

describe("project module and symbol models", () => {
  it("summarizes imports, exports, declarations, calls, and references", () => {
    const root = createProject({
      "src/a.ts": `
import { b as bee } from './b';
export const value = bee();
function local() { return value; }
local();
`,
      "src/b.ts": "export function b() { return 1; }\n",
    });
    const project = discoverProject({ root });

    const modules = buildModuleModel(project);
    const symbols = buildSymbolModel(project);

    expect(modules.modules.find((module) => module.file === "src/a.ts")).toMatchObject({
      imports: [{ specifier: "./b" }],
      declarations: ["value", "local"],
      topLevelCalls: ["local"],
      hasSideEffects: true,
    });
    expect(modules.modules.find((module) => module.file === "src/b.ts")).toMatchObject({
      exports: ["b"],
      declarations: ["b"],
    });
    expect(symbols.declarations.map((item) => [item.name, item.imported])).toContainEqual(["bee", true]);
    expect(symbols.declarations).toEqual(expect.arrayContaining([expect.objectContaining({ name: "value", exported: true })]));
    expect(symbols.references.some((item) => item.name === "value" && item.file === "src/a.ts")).toBe(true);
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-modules-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
