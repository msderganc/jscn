import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/config/defaults.js";
import { defaultConfigToml } from "../../src/config/write-default.js";

describe("default config", () => {
  it("matches the documented first-slice sections", () => {
    expect(defaultConfigToml).toContain("[output]");
    expect(defaultConfigToml).toContain("[analysis]");
    expect(defaultConfigToml).toContain("[complexity]");
    expect(defaultConfigToml).toContain("[dependencies]");
    expect(defaultConfigToml).toContain("[dead_code]");
    expect(defaultConfigToml).toContain("[di]");
    expect(defaultConfigToml).toContain("[clones]");
    expect(defaultConfig.analysis.includePatterns).toEqual(["**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"]);
    expect(defaultConfig.analysis.followSymlinks).toBe(false);
    expect(defaultConfig.deadCode.reportIntentionalUnused).toBe(false);
    expect(defaultConfig.di.containerNames).toContain("container");
    expect(defaultConfig.clones.includeTestBoilerplate).toBe(false);
  });
});
