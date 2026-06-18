import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fixtureProject, runCli } from "./helpers.js";

describe("check command", () => {
  it("returns 0 for a clean selected complexity and dependency run", () => {
    const root = fixtureProject();

    const result = runCli(root, ["check", "--select", "complexity,deps", "--max-complexity", "20", "src/clean.ts"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  }, 15_000);

  it("returns 1 for complexity issues and dependency cycles", () => {
    const root = fixtureProject();
    writeFileSync(join(root, "src/a.ts"), "import './b';\n", "utf8");
    writeFileSync(join(root, "src/b.ts"), "import './a';\n", "utf8");

    expect(runCli(root, ["check", "--select", "complexity", "--max-complexity", "2", "src/complex.ts"]).exitCode).toBe(1);
    expect(runCli(root, ["check", "--select", "deps", "src/a.ts", "src/b.ts"]).exitCode).toBe(1);
  });

  it("checks a single absolute directory input from another cwd", () => {
    const caller = fixtureProject();
    const target = fixtureProject();

    const result = runCli(caller, ["check", "--select", "complexity", "--max-complexity", "20", target]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Files: 2");
  }, 15_000);

  it("suppresses clean quiet output and still prints issues", () => {
    const cleanRoot = fixtureProject();
    const clean = runCli(cleanRoot, ["check", "--quiet", "--select", "complexity", "--max-complexity", "20", "src/clean.ts"]);

    expect(clean.exitCode).toBe(0);
    expect(clean.stdout).toBe("");

    const issueRoot = fixtureProject();
    const issue = runCli(issueRoot, ["check", "--quiet", "--select", "complexity", "--max-complexity", "2", "src/complex.ts"]);

    expect(issue.exitCode).toBe(1);
    expect(issue.stdout).toContain("Issues:");
    expect(issue.stdout).toContain("Complexity");
  });
});
