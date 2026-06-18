import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProject } from "../../src/project/discover.js";
import { extractDeclarations } from "../../src/project/declarations.js";

describe("extractDeclarations", () => {
  it("normalizes common JS and TS function forms", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-declarations-"));
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, "src/basic.ts"),
      `
function named() {}
const expr = function () {};
const arrow = () => true;
class Example {
  constructor() {}
  method() {}
  field = () => true;
  fieldFunction = function () { return true; };
}
`,
      "utf8"
    );

    const project = discoverProject({ root });
    const declarations = extractDeclarations(project);

    expect(declarations.map((item) => [item.kind, item.name])).toEqual([
      ["function", "named"],
      ["function-expression", "expr"],
      ["arrow-function", "arrow"],
      ["constructor", "constructor"],
      ["method", "method"],
      ["class-field-function", "field"],
      ["class-field-function", "fieldFunction"],
    ]);
  }, 15_000);

  it("extracts nested functions as separate declarations", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-declarations-"));
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, "src/nested.ts"),
      `
export function outer() {
  function inner() {
    if (true) return true;
    return false;
  }
  const arrow = () => {
    if (true) return true;
    return false;
  };
  return inner() && arrow();
}
`,
      "utf8"
    );

    const project = discoverProject({ root });
    const declarations = extractDeclarations(project);

    expect(declarations.map((item) => item.name)).toEqual(["outer", "inner", "arrow"]);
    expect(declarations.map((item) => item.branches.length)).toEqual([1, 1, 1]);
  });
});
