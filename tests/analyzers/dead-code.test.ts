import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalysis } from "../../src/analyzers/runner.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("dead code analyzer", () => {
  it("reports unreachable statements and conservative unused locals", () => {
    const root = createProject({
      "src/a.ts": "function unused() {}\nexport function publicApi() {}\nfunction used(){ return 1; }\nused();\nfunction f(){ return 1; console.log('x'); }\n",
    });
    const result = analyze(root, ["deadcode"]);

    expect(result.analyses.deadCode?.unreachable).toHaveLength(1);
    expect(result.analyses.deadCode?.unused.map((item) => item.symbol)).toContain("unused");
    expect(result.issues.some((item) => item.analyzer === "deadcode")).toBe(true);
  }, 15_000);

  it("does not report local JSX components as unused when tags reference them", () => {
    const root = createProject({
      "src/a.tsx": `
function Card() { return <div />; }
const Section = { Label: Card };
function Page() { return <><Card /><Section.Label /></>; }
Page();
`,
    });
    const result = analyze(root, ["deadcode"]);

    expect(result.analyses.deadCode?.unused.map((item) => item.symbol)).not.toContain("Card");
    expect(result.analyses.deadCode?.unused.map((item) => item.symbol)).not.toContain("Section");
  }, 15_000);

  it("suppresses underscore-prefixed locals by default and reports them when configured", () => {
    const root = createProject({ "src/a.ts": "const _intentional = 1;\nconst unused = 2;\n" });
    const defaultResult = analyze(root, ["deadcode"]);
    const configuredResult = runAnalysis({
      project: discoverProject({ root }),
      config: { ...defaultConfig, deadCode: { reportIntentionalUnused: true } },
      selectedAnalyzers: ["deadcode"],
      generatedAt: "now",
      startedAtMs: 0,
      endedAtMs: 1,
    });

    expect(defaultResult.analyses.deadCode?.unused.map((item) => item.symbol)).toEqual(["unused"]);
    expect(configuredResult.analyses.deadCode?.unused.map((item) => item.symbol)).toEqual(["_intentional", "unused"]);
  }, 15_000);
});

function analyze(root: string, selectedAnalyzers: string[]) {
  return runAnalysis({ project: discoverProject({ root }), config: defaultConfig, selectedAnalyzers, generatedAt: "now", startedAtMs: 0, endedAtMs: 1 });
}

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-dead-code-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
