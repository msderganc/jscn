import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/config/defaults.js";
import { defaultConfigToml } from "../../src/config/write-default.js";

describe("default config", () => {
  it("matches the documented first-slice sections", () => {
    expect(defaultConfigToml).toContain("[output]");
    expect(defaultConfigToml).toContain("[analysis]");
    expect(defaultConfigToml).toContain("[complexity]");
    expect(defaultConfigToml).toContain("[dependencies]");
    expect(defaultConfig.analysis.includePatterns).toEqual(["**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"]);
    expect(defaultConfig.analysis.followSymlinks).toBe(false);
  });
});
