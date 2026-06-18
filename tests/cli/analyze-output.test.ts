import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fixtureProject, runCli } from "./helpers.js";

describe("analyze output formats", () => {
  it("writes YAML, CSV, and HTML to requested output paths", () => {
    const yamlRoot = fixtureProject();
    const yamlPath = join(yamlRoot, "reports", "report.yaml");
    expect(runCli(yamlRoot, ["analyze", "--yaml", "--output", yamlPath, "src"]).exitCode).toBe(0);
    expect(readFileSync(yamlPath, "utf8")).toContain("summary:");

    const csvRoot = fixtureProject();
    const csvPath = join(csvRoot, "reports", "report.csv");
    expect(runCli(csvRoot, ["analyze", "--csv", "--output", csvPath, "src/complex.ts"]).exitCode).toBe(0);
    expect(readFileSync(csvPath, "utf8")).toContain("id,analyzer,severity,file,line,column,rule,message");

    const htmlRoot = fixtureProject();
    const htmlPath = join(htmlRoot, "reports", "report.html");
    expect(runCli(htmlRoot, ["analyze", "--html", "--no-open", "--output", htmlPath, "src"]).exitCode).toBe(0);
    expect(readFileSync(htmlPath, "utf8")).toContain("<!doctype html>");
  }, 15_000);

  it("accepts --no-open for HTML output without stderr noise", () => {
    const root = fixtureProject();
    const result = runCli(root, ["analyze", "--html", "--no-open", "src"]);

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(root, ".jscn", "reports"))).toBe(true);
    expect(result.stderr).toBe("");
  });
});
