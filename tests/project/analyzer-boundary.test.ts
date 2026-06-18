import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("analyzer boundary", () => {
  it("keeps parser node types out of public analyzer types", () => {
    const source = [
      readFileSync("src/analyzers/types.ts", "utf8"),
      readFileSync("src/analyzers/complexity.ts", "utf8"),
    ].join("\n");

    expect(source).not.toContain("@typescript-eslint");
    expect(source).not.toContain("typescript");
    expect(source).not.toContain("IfStatement");
    expect(source).not.toContain("LogicalExpression");
  });
});
