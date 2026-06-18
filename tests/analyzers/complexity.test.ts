import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/config/defaults.js";
import { analyzeComplexity } from "../../src/analyzers/complexity.js";
import { discoverProject } from "../../src/project/discover.js";

describe("analyzeComplexity", () => {
  it("counts branch constructs in normalized declarations", () => {
    const project = fixtureProject(`
export function complex(value: string | undefined) {
  if (value) {
    for (const item of [value]) {
      while (item.length > 0) {
        break;
      }
    }
  } else if (value === '') {
    return false;
  }
  try {
    return value === 'a' || value === 'b' ? true : false;
  } catch {
    return false;
  }
  switch (value) {
    case 'x':
      return true;
    default:
      return false;
  }
}
`);

    const report = analyzeComplexity(project, defaultConfig);

    expect(report.functions[0]?.metrics).toMatchObject({
      complexity: 9,
      branchCount: 8,
    });
  }, 15_000);

  it("does not count optional chaining by itself", () => {
    const project = fixtureProject("export const read = (value?: { a?: string }) => value?.a;\n");

    const report = analyzeComplexity(project, defaultConfig);

    expect(report.functions[0]?.metrics.complexity).toBe(1);
  });

  it("filters unchanged functions when report_unchanged is disabled", () => {
    const project = fixtureProject(`
export const clean = () => true;
export function complex(v: string) {
  if (v) return true;
  if (v === 'x') return true;
  if (v === 'y') return true;
  if (v === 'z') return true;
  if (v === 'q') return true;
  if (v === 'w') return true;
  if (v === 'e') return true;
  if (v === 'r') return true;
  if (v === 't') return true;
}
`);

    const report = analyzeComplexity(project, {
      ...defaultConfig,
      complexity: { ...defaultConfig.complexity, reportUnchanged: false, lowThreshold: 9 },
    });

    expect(report.functions.map((item) => item.name)).toEqual(["complex"]);
  });

  it("does not count nested function branches against the outer function", () => {
    const project = fixtureProject(`
export function outer() {
  function inner() {
    if (true) return true;
    return false;
  }
  return inner();
}
`);

    const report = analyzeComplexity(project, defaultConfig);
    const byName = new Map(report.functions.map((item) => [item.name, item.metrics.complexity]));

    expect(byName.get("outer")).toBe(1);
    expect(byName.get("inner")).toBe(2);
  });
});

function fixtureProject(source: string) {
  const root = mkdtempSync(join(tmpdir(), "jscn-complexity-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/basic.ts"), source, "utf8");
  return discoverProject({ root });
}
