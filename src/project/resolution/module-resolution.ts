import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

import type { DependencyEdgeKind } from "../../core/schema.js";
import type { ProjectModel } from "../model.js";
import { assertInsideRoot, toProjectRelativePath } from "../path-safety.js";

export interface ModuleResolver {
  resolve(fromFile: string, specifier: string, options: { kind: DependencyEdgeKind }): ResolvedModule;
}

export interface ResolvedModule {
  specifier: string;
  resolvedPath?: string;
  packageName?: string;
  external: boolean;
  unresolved: boolean;
  diagnostics: string[];
}

export function createModuleResolver(project: ProjectModel): ModuleResolver {
  const compilerOptions = readCompilerOptions(project.root);
  const workspacePackages = readWorkspacePackages(project.root);
  const host = ts.createCompilerHost(compilerOptions, true);

  return {
    resolve(fromFile, specifier, options) {
      const external = !specifier.startsWith(".") && !specifier.startsWith("/");
      const fromAbsolute = resolve(project.root, fromFile);
      const resolvedModule = ts.resolveModuleName(specifier, fromAbsolute, compilerOptions, host).resolvedModule;

      if (resolvedModule?.resolvedFileName) {
        const resolvedPath = resolvedModule.resolvedFileName;
        if (resolvedPath.includes("/node_modules/")) {
          return { specifier, packageName: packageName(specifier), external: true, unresolved: false, diagnostics: [] };
        }

        try {
          assertInsideRoot(resolvedPath, project.root);
          return {
            specifier,
            resolvedPath: toProjectRelativePath(resolvedPath, project.root),
            external: false,
            unresolved: false,
            diagnostics: [],
          };
        } catch (error) {
          return { specifier, external, unresolved: true, diagnostics: [error instanceof Error ? error.message : String(error)] };
        }
      }

      if (external) {
        const workspace = workspacePackages.get(packageName(specifier));
        if (workspace) {
          const entry = resolveWorkspaceEntry(workspace, specifier, options.kind);
          if (entry) {
            return {
              specifier,
              resolvedPath: toProjectRelativePath(entry, project.root),
              packageName: packageName(specifier),
              external: false,
              unresolved: false,
              diagnostics: [],
            };
          }
        }
      }

      return { specifier, packageName: external ? packageName(specifier) : undefined, external, unresolved: !external, diagnostics: [] };
    },
  };
}

function readCompilerOptions(root: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    return { moduleResolution: ts.ModuleResolutionKind.NodeNext, module: ts.ModuleKind.NodeNext, allowJs: true };
  }

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    return { moduleResolution: ts.ModuleResolutionKind.NodeNext, module: ts.ModuleKind.NodeNext, allowJs: true };
  }

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  return { ...parsed.options, allowJs: true };
}

function readWorkspacePackages(root: string): Map<string, string> {
  const packages = new Map<string, string>();
  for (const dir of ["packages", "apps"]) {
    const base = join(root, dir);
    if (!existsSync(base)) {
      continue;
    }
    for (const entry of readdirSync(base)) {
      const child = join(base, entry);
      if (!statSync(child).isDirectory()) {
        continue;
      }
      const packagePath = join(child, "package.json");
      if (!existsSync(packagePath)) {
        continue;
      }
      const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
      if (parsed.name) {
        packages.set(parsed.name, child);
      }
    }
  }
  return packages;
}

function resolveWorkspaceEntry(packageRoot: string, specifier: string, kind: DependencyEdgeKind): string | undefined {
  const packagePath = join(packageRoot, "package.json");
  if (existsSync(packagePath)) {
    const entry = entryFromPackageJson(packageRoot, specifier, kind, JSON.parse(readFileSync(packagePath, "utf8")) as PackageJson);
    if (entry) {
      return entry;
    }
  }

  for (const candidate of ["src/index.ts", "src/index.tsx", "index.ts", "index.js"]) {
    const absolute = join(packageRoot, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }
  return undefined;
}

interface PackageJson {
  name?: string;
  main?: string;
  types?: string;
  exports?: unknown;
}

function entryFromPackageJson(packageRoot: string, specifier: string, kind: DependencyEdgeKind, packageJson: PackageJson): string | undefined {
  const subpath = packageSubpath(specifier, packageJson.name);
  const exported = exportTarget(packageJson.exports, subpath, kind);
  for (const candidate of [exported, packageJson.types, packageJson.main]) {
    if (typeof candidate !== "string") {
      continue;
    }
    const absolute = resolve(packageRoot, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }
  return undefined;
}

function exportTarget(exportsField: unknown, subpath: string, kind: DependencyEdgeKind): string | undefined {
  if (typeof exportsField === "string") {
    return subpath === "." ? exportsField : undefined;
  }

  if (!exportsField || typeof exportsField !== "object" || Array.isArray(exportsField)) {
    return undefined;
  }

  const record = exportsField as Record<string, unknown>;
  const target = record[subpath] ?? (subpath === "." ? record["."] : undefined);
  return conditionalExportTarget(target, kind);
}

function conditionalExportTarget(target: unknown, kind: DependencyEdgeKind): string | undefined {
  if (typeof target === "string") {
    return target;
  }
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return undefined;
  }

  const record = target as Record<string, unknown>;
  const preferred = kind === "require" ? record.require : record.import;
  for (const candidate of [preferred, record.default, record.types]) {
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return undefined;
}

function packageSubpath(specifier: string, name: string | undefined): string {
  if (!name || specifier === name) {
    return ".";
  }
  return `.${specifier.slice(name.length)}`;
}

function packageName(specifier: string): string {
  if (specifier.startsWith("@")) {
    return specifier.split("/").slice(0, 2).join("/");
  }
  return specifier.split("/")[0] ?? specifier;
}
