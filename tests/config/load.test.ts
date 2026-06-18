import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ConfigValidationError } from "../../src/config/schema.js";
import { loadConfig } from "../../src/config/load.js";

describe("loadConfig", () => {
  it("discovers .jscn.toml from a nested workspace path", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-config-"));
    const nested = join(root, "packages", "app", "src");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(root, ".jscn.toml"), "[complexity]\nmax_complexity = 12\n", "utf8");

    const loaded = loadConfig({ cwd: nested });

    expect(loaded.configPath).toBe(join(root, ".jscn.toml"));
    expect(loaded.config.complexity.maxComplexity).toBe(12);
  });

  it("loads an explicit config path instead of discovered config", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-config-"));
    const nested = join(root, "src");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(root, ".jscn.toml"), "[complexity]\nmax_complexity = 5\n", "utf8");
    writeFileSync(join(nested, "custom.toml"), "[complexity]\nmax_complexity = 17\n", "utf8");

    const loaded = loadConfig({ cwd: nested, configPath: "custom.toml" });

    expect(loaded.configPath).toBe(join(nested, "custom.toml"));
    expect(loaded.config.complexity.maxComplexity).toBe(17);
  });

  it("lets CLI overrides beat config values", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-config-"));
    writeFileSync(join(root, ".jscn.toml"), "[complexity]\nmax_complexity = 5\n", "utf8");

    const loaded = loadConfig({
      cwd: root,
      overrides: { complexity: { maxComplexity: 21 } },
    });

    expect(loaded.config.complexity.maxComplexity).toBe(21);
  });

  it("maps analyzer TOML options to camelCase config fields", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-config-"));
    writeFileSync(
      join(root, ".jscn.toml"),
      [
        "[dead_code]",
        "report_intentional_unused = true",
        "",
        "[di]",
        "container_names = [\"ioc\"]",
        "lookup_methods = [\"resolve\"]",
        "composition_roots = [\"src/root.ts\"]",
        "",
        "[clones]",
        "include_test_boilerplate = true",
        "min_normalized_chars = 60",
        "min_non_import_chars = 25",
        "",
      ].join("\n"),
      "utf8",
    );

    const loaded = loadConfig({ cwd: root });

    expect(loaded.config.deadCode.reportIntentionalUnused).toBe(true);
    expect(loaded.config.di).toMatchObject({
      containerNames: ["ioc"],
      lookupMethods: ["resolve"],
      compositionRoots: ["src/root.ts"],
    });
    expect(loaded.config.clones).toMatchObject({
      includeTestBoilerplate: true,
      minNormalizedChars: 60,
      minNonImportChars: 25,
    });
  });

  it("rejects invalid thresholds through shared validation", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-config-"));
    writeFileSync(join(root, ".jscn.toml"), "[complexity]\nlow_threshold = 20\nmedium_threshold = 10\n", "utf8");

    expect(() => loadConfig({ cwd: root })).toThrow(ConfigValidationError);
  });

  it("rejects empty DI matcher arrays", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-config-"));
    writeFileSync(join(root, ".jscn.toml"), "[di]\ncontainer_names = []\nlookup_methods = []\ncomposition_roots = []\n", "utf8");

    expect(() => loadConfig({ cwd: root })).toThrow(ConfigValidationError);
  });
});
