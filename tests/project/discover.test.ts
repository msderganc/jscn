import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/config/defaults.js";
import { ProjectDiscoveryError } from "../../src/project/errors.js";
import { discoverProject } from "../../src/project/discover.js";

describe("discoverProject", () => {
  it("includes supported JS and TS extensions", () => {
    const root = createProject();
    for (const ext of ["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts"]) {
      writeFileSync(join(root, `src/file.${ext}`), "export const value = 1;\n", "utf8");
    }

    const project = discoverProject({ root });

    expect(project.files.map((file) => file.relativePath)).toEqual([
      "src/file.cjs",
      "src/file.cts",
      "src/file.js",
      "src/file.jsx",
      "src/file.mjs",
      "src/file.mts",
      "src/file.ts",
      "src/file.tsx",
    ]);
  });

  it("applies default excludes", () => {
    const root = createProject();
    writeFileSync(join(root, "src/a.ts"), "export const a = 1;\n", "utf8");
    for (const dir of ["node_modules", "dist", "build", ".next", "coverage"]) {
      mkdirSync(join(root, dir), { recursive: true });
      writeFileSync(join(root, dir, "ignored.ts"), "export const ignored = true;\n", "utf8");
    }

    const project = discoverProject({ root });

    expect(project.files.map((file) => file.relativePath)).toEqual(["src/a.ts"]);
  });

  it("supports explicit file and directory inputs", () => {
    const root = createProject();
    writeFileSync(join(root, "src/a.ts"), "export const a = 1;\n", "utf8");
    writeFileSync(join(root, "src/b.js"), "export const b = 1;\n", "utf8");

    const project = discoverProject({ root, inputs: ["src/a.ts"] });

    expect(project.files.map((file) => file.relativePath)).toEqual(["src/a.ts"]);
  });

  it("does not follow symlinks by default", () => {
    const root = createProject();
    writeFileSync(join(root, "src/a.ts"), "export const a = 1;\n", "utf8");
    symlinkSync(join(root, "src/a.ts"), join(root, "src/link.ts"));

    const project = discoverProject({ root });

    expect(project.files.map((file) => file.relativePath)).toEqual(["src/a.ts"]);
  });

  it("rejects followed symlink targets outside the root", () => {
    const root = createProject();
    const outside = mkdtempSync(join(tmpdir(), "jscn-outside-"));
    writeFileSync(join(outside, "secret.ts"), "export const secret = true;\n", "utf8");
    symlinkSync(join(outside, "secret.ts"), join(root, "src/link.ts"));

    expect(() =>
      discoverProject({
        root,
        config: {
          ...defaultConfig,
          analysis: { ...defaultConfig.analysis, followSymlinks: true },
        },
      })
    ).toThrow(ProjectDiscoveryError);
  });

  it("throws a typed error when a file exceeds max_file_size_kb", () => {
    const root = createProject();
    writeFileSync(join(root, "src/large.ts"), "x".repeat(2048), "utf8");

    expect(() =>
      discoverProject({
        root,
        config: {
          ...defaultConfig,
          analysis: { ...defaultConfig.analysis, maxFileSizeKb: 1 },
        },
      })
    ).toThrow(ProjectDiscoveryError);
  });

  it("skips binary files", () => {
    const root = createProject();
    writeFileSync(join(root, "src/a.ts"), Buffer.from([0, 1, 2, 3, 4]));

    const project = discoverProject({ root });

    expect(project.files).toHaveLength(0);
    expect(project.skippedFiles).toEqual([{ path: "src/a.ts", reason: "binary" }]);
  });
});

function createProject(): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-project-"));
  mkdirSync(join(root, "src"), { recursive: true });
  return root;
}
