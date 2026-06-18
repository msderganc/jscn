import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "../cli/helpers.js";

describe("README examples", () => {
  it("runs documented analyze and check examples against a fixture", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-readme-"));
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src/a.ts"), "export const a = true;\n", "utf8");

    expect(readFileSync("README.md", "utf8")).toContain("jscn analyze --output - src");
    expect(runCli(root, ["analyze", "--output", "-", "src"]).exitCode).toBe(0);
    expect(runCli(root, ["check", "--select", "complexity,deps", "src"]).exitCode).toBe(0);
  }, 15_000);
});
