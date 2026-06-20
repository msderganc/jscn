import { describe, expect, it } from "vitest";

import { renderYaml } from "../../src/reporters/yaml.js";
import { sampleResult } from "./helpers.js";

describe("yaml reporter", () => {
  it("mirrors canonical JSON keys and quotes unsafe strings", () => {
    const output = renderYaml(sampleResult());

    expect(output).toContain('version: "0.1.2"');
    expect(output).toContain("summary:");
    expect(output).toContain("issues:");
    expect(output).toContain('message: "unsafe <script>alert(1)</script>, value"');
    expect(output.endsWith("\n")).toBe(true);
  });
});
