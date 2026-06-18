import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { fixtureProject, runCli } from "./helpers.js";

describe("analyze command", () => {
  it("writes JSON-only stdout for --output -", () => {
    const root = fixtureProject();

    const result = runCli(root, ["analyze", "--select", "complexity", "--output", "-", "src"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toMatch(/^\{/);
    expect(result.stdout).not.toContain("Files:");
    expect(JSON.parse(result.stdout)).toMatchObject({
      summary: { analyzedFiles: 2 },
      analyses: { complexity: expect.any(Object) },
    });
  }, 15_000);

  it("uses a single absolute directory input as the analysis root", () => {
    const caller = fixtureProject();
    const target = fixtureProject();
    mkdirSync(join(target, "nested"), { recursive: true });
    writeFileSync(join(target, "nested/only.ts"), "export const only = () => true;\n", "utf8");

    const result = runCli(caller, ["analyze", "--select", "complexity", "--output", "-", target]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      root: target,
      summary: { analyzedFiles: 3 },
    });
  }, 15_000);

  it("returns 2 for missing paths, invalid config, oversized files, unsupported inputs, unsafe traversal, and outside-root symlink targets", () => {
    const root = fixtureProject();
    writeFileSync(join(root, "bad.toml"), "[complexity]\nlow_threshold = 20\nmedium_threshold = 1\n", "utf8");
    writeFileSync(join(root, "README.md"), "# no supported source here\n", "utf8");
    writeFileSync(join(root, "src/huge.ts"), `export const huge = "${"x".repeat(1200)}";\n`, "utf8");

    expect(runCli(root, ["analyze", "missing.ts"]).exitCode).toBe(2);
    expect(runCli(root, ["analyze", "--config", "bad.toml", "src"]).exitCode).toBe(2);
    expect(runCli(root, ["analyze", "--config", writeConfig(root, "max_file_size_kb = 1"), "src/huge.ts"]).exitCode).toBe(2);
    expect(runCli(root, ["analyze", "README.md"]).exitCode).toBe(2);
    expect(runCli(root, ["analyze", "../outside.ts"]).exitCode).toBe(2);

    const outside = resolve(root, "..", "outside-target.ts");
    writeFileSync(outside, "export const outside = true;\n", "utf8");
    symlinkSync(outside, join(root, "src/outside-link.ts"));
    expect(runCli(root, ["analyze", "--config", writeConfig(root, "follow_symlinks = true"), "src"]).exitCode).toBe(2);
  });
});

function writeConfig(root: string, analysisBody: string): string {
  const path = join(root, `jscn-${Math.random().toString(36).slice(2)}.toml`);
  writeFileSync(path, `[analysis]\n${analysisBody}\n`, "utf8");
  return path;
}
