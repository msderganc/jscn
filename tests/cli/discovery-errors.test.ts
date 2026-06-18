import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runCli } from "./helpers.js";

describe("CLI discovery failures", () => {
  it("returns 2 when a directory has no supported JavaScript or TypeScript files", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-empty-"));
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "docs/README.md"),
      readFileSync("tests/fixtures/cli/no-supported-files/README.md", "utf8"),
      "utf8"
    );

    const result = runCli(root, ["check", "docs"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("No supported JavaScript or TypeScript files found");
  });
});
