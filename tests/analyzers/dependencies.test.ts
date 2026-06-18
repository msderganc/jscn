import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeDependencies } from "../../src/analyzers/dependencies.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { discoverProject } from "../../src/project/discover.js";

describe("analyzeDependencies", () => {
  it("extracts import, export-from, require, dynamic, external, and unresolved edges", () => {
    const root = createProject({
      "src/a.ts": `
import { b } from './b';
import type { T } from './types';
export { b } from './b';
const c = require('./c.cjs');
const d = import('./d');
import pkg from 'pkg';
import missing from './missing';
`,
      "src/b.ts": "export const b = 1;\n",
      "src/types.ts": "export interface T { value: string }\n",
      "src/c.cjs": "module.exports = {};\n",
      "src/d.ts": "export const d = 1;\n",
    });

    const project = discoverProject({ root });
    const report = analyzeDependencies(project, { includeTypeOnly: true, includeExternal: true });

    expect(report.edges.map((edge) => [edge.from, edge.to, edge.kind, edge.resolved, edge.external])).toEqual([
      ["src/a.ts", "src/b.ts", "runtime", true, false],
      ["src/a.ts", "src/types.ts", "type-only", true, false],
      ["src/a.ts", "src/b.ts", "export-from", true, false],
      ["src/a.ts", "src/c.cjs", "require", true, false],
      ["src/a.ts", "src/d.ts", "dynamic", true, false],
      ["src/a.ts", "pkg", "external", false, true],
      ["src/a.ts", "./missing", "unresolved", false, false],
    ]);
  }, 15_000);

  it("omits type-only and external edges by default options", () => {
    const root = createProject({
      "src/a.ts": "import type { T } from './types';\nimport pkg from 'pkg';\n",
      "src/types.ts": "export interface T { value: string }\n",
    });

    const project = discoverProject({ root });
    const report = analyzeDependencies(project, { includeTypeOnly: false, includeExternal: false });

    expect(report.edges).toEqual([]);
  });

  it("classifies modern type-only imports and exports as type-only edges", () => {
    const root = createProject({
      "src/a.ts": "import { type B } from './b';\nexport type { B } from './b';\n",
      "src/b.ts": "export interface B { value: string }\n",
    });

    const project = discoverProject({ root });

    expect(analyzeDependencies(project, { includeTypeOnly: false, includeExternal: false }).edges).toEqual([]);
    expect(analyzeDependencies(project, { includeTypeOnly: true, includeExternal: false }).edges.map((edge) => edge.kind)).toEqual([
      "type-only",
      "type-only",
    ]);
  });

  it("resolves declaration files", () => {
    const root = createProject({
      "src/a.ts": "import type { B } from './types';\n",
      "src/types.d.ts": "export interface B { value: string }\n",
    });

    const report = analyzeDependencies(discoverProject({ root }), { includeTypeOnly: true, includeExternal: false });

    expect(report.edges[0]).toMatchObject({ to: "src/types.d.ts", resolved: true, kind: "type-only" });
  });

  it("does not treat a locally declared require function as CommonJS dependency usage", () => {
    const root = createProject({
      "src/a.ts": "const require = (value: string) => value;\nrequire('./b');\n",
      "src/b.ts": "export const b = 1;\n",
    });

    const report = analyzeDependencies(discoverProject({ root }), { includeTypeOnly: false, includeExternal: false });

    expect(report.edges).toEqual([]);
  });

  it("resolves tsconfig paths, workspace packages, and mts/cts files", () => {
    const root = createProject({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          baseUrl: ".",
          paths: { "@lib/*": ["src/lib/*"] },
        },
      }),
      "package.json": JSON.stringify({ type: "module" }),
      "src/a.ts": "import { b } from '@lib/b';\nimport { pkg } from '@scope/pkg';\nimport './esm.mjs';\nconst c = require('./common.cjs');\n",
      "src/lib/b.ts": "export const b = 1;\n",
      "src/esm.mts": "export const esm = 1;\n",
      "src/common.cts": "export const common = 1;\n",
      "packages/pkg/package.json": JSON.stringify({ name: "@scope/pkg" }),
      "packages/pkg/src/index.ts": "export const pkg = 1;\n",
    });

    const report = analyzeDependencies(discoverProject({ root }), { includeTypeOnly: true, includeExternal: true });

    expect(report.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ specifier: "@lib/b", to: "src/lib/b.ts", kind: "runtime", resolved: true, external: false }),
        expect.objectContaining({ specifier: "@scope/pkg", to: "packages/pkg/src/index.ts", kind: "runtime", resolved: true, external: false }),
        expect.objectContaining({ specifier: "./esm.mjs", to: "src/esm.mts", kind: "runtime", resolved: true, external: false }),
        expect.objectContaining({ specifier: "./common.cjs", to: "src/common.cts", kind: "require", resolved: true, external: false }),
      ])
    );
  }, 15_000);

  it("resolves workspace package exports and conditional import/require branches", () => {
    const root = createProject({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
        },
      }),
      "src/a.ts": "import { feature } from '@scope/pkg/feature';\nconst legacy = require('@scope/pkg/legacy');\n",
      "packages/pkg/package.json": JSON.stringify({
        name: "@scope/pkg",
        exports: {
          "./feature": { import: "./src/feature.ts", require: "./src/feature.cts" },
          "./legacy": { require: "./src/legacy.cts", import: "./src/legacy.ts" },
        },
      }),
      "packages/pkg/src/feature.ts": "export const feature = 1;\n",
      "packages/pkg/src/feature.cts": "export const feature = 1;\n",
      "packages/pkg/src/legacy.ts": "export const legacy = 1;\n",
      "packages/pkg/src/legacy.cts": "export const legacy = 1;\n",
    });

    const report = analyzeDependencies(discoverProject({ root }), { includeTypeOnly: true, includeExternal: true });

    expect(report.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ specifier: "@scope/pkg/feature", to: "packages/pkg/src/feature.ts", kind: "runtime" }),
        expect.objectContaining({ specifier: "@scope/pkg/legacy", to: "packages/pkg/src/legacy.cts", kind: "require" }),
      ])
    );
  }, 15_000);

  it("resolves package imports through workspace packages shaped like project references", () => {
    const root = createProject({
      "tsconfig.json": JSON.stringify({
        files: [],
        references: [{ path: "./packages/a" }, { path: "./packages/b" }],
      }),
      "packages/a/tsconfig.json": JSON.stringify({ compilerOptions: { composite: true, module: "NodeNext", moduleResolution: "NodeNext" } }),
      "packages/a/package.json": JSON.stringify({ name: "@repo/a", exports: "./src/index.ts" }),
      "packages/a/src/index.ts": "export const a = 1;\n",
      "packages/b/tsconfig.json": JSON.stringify({ compilerOptions: { composite: true, module: "NodeNext", moduleResolution: "NodeNext" } }),
      "packages/b/package.json": JSON.stringify({ name: "@repo/b" }),
      "packages/b/src/index.ts": "import { a } from '@repo/a';\nexport const b = a;\n",
    });

    const report = analyzeDependencies(discoverProject({ root }), { includeTypeOnly: true, includeExternal: true });

    expect(report.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "packages/b/src/index.ts", specifier: "@repo/a", to: "packages/a/src/index.ts", resolved: true }),
      ])
    );
  }, 15_000);

  it("retains unresolved specifier and source location", () => {
    const root = createProject({
      "src/a.ts": "\nimport missing from './missing';\n",
    });

    const report = analyzeDependencies(discoverProject({ root }), { includeTypeOnly: true, includeExternal: true });

    expect(report.edges[0]).toMatchObject({
      from: "src/a.ts",
      to: "./missing",
      specifier: "./missing",
      kind: "unresolved",
      resolved: false,
      loc: { line: 2, column: 1 },
    });
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-deps-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
