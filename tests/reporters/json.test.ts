import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAnalysisResult } from "../../src/core/result.js";
import { renderJson, writeJson } from "../../src/reporters/json.js";

describe("json reporter", () => {
  it("renders canonical JSON with a trailing newline", () => {
    const result = createAnalysisResult({
      version: "0.1.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 1,
      root: "/repo",
    });

    expect(JSON.parse(renderJson(result)).version).toBe("0.1.0");
    expect(renderJson(result).endsWith("\n")).toBe(true);
  });

  it("creates parent directories when writing JSON", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-json-"));
    const path = join(root, "nested", "report.json");
    const result = createAnalysisResult({
      version: "0.1.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 1,
      root,
    });

    writeJson(path, result);

    expect(JSON.parse(readFileSync(path, "utf8")).root).toBe(root);
  });
});
