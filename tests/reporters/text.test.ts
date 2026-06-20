import { describe, expect, it } from "vitest";

import { createAnalysisResult } from "../../src/core/result.js";
import { renderText } from "../../src/reporters/text.js";

describe("text reporter", () => {
  it("prints a concise human summary", () => {
    const result = createAnalysisResult({
      version: "0.1.2",
      generatedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 1,
      root: "/repo",
      summary: { analyzedFiles: 2, skippedFiles: 1 },
    });

    expect(renderText(result)).toContain("Files: 2 analyzed, 1 skipped");
  });
});
