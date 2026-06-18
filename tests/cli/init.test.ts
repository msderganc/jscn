import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { main } from "../../src/cli/main.js";

describe("init command", () => {
  it("creates .jscn.toml in the current directory", () => {
    const cwd = mkdtempSync(join(tmpdir(), "jscn-init-"));

    const result = withCwd(cwd, () => main(["node", "jscn", "init"]));

    expect(result).toBe(0);
    expect(existsSync(join(cwd, ".jscn.toml"))).toBe(true);
    expect(readFileSync(join(cwd, ".jscn.toml"), "utf8")).toContain("[dependencies]");
  });

  it("refuses to overwrite existing config without --force", () => {
    const cwd = mkdtempSync(join(tmpdir(), "jscn-init-"));
    writeFileSync(join(cwd, ".jscn.toml"), "existing = true\n", "utf8");

    const result = withCwd(cwd, () => main(["node", "jscn", "init"]));

    expect(result).toBe(2);
    expect(readFileSync(join(cwd, ".jscn.toml"), "utf8")).toBe("existing = true\n");
  });

  it("overwrites existing config with --force", () => {
    const cwd = mkdtempSync(join(tmpdir(), "jscn-init-"));
    writeFileSync(join(cwd, ".jscn.toml"), "existing = true\n", "utf8");

    const result = withCwd(cwd, () => main(["node", "jscn", "init", "--force"]));

    expect(result).toBe(0);
    expect(readFileSync(join(cwd, ".jscn.toml"), "utf8")).toContain("[analysis]");
  });
});

function withCwd<T>(cwd: string, run: () => T): T {
  const previous = process.cwd();
  const previousExitCode = process.exitCode;
  process.chdir(cwd);
  process.exitCode = undefined;

  try {
    return run();
  } finally {
    process.chdir(previous);
    process.exitCode = previousExitCode;
  }
}
