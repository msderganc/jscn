import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

import fg from "fast-glob";
import { minimatch } from "minimatch";

import { defaultConfig } from "../config/defaults.js";
import type { ResolvedConfig } from "../config/schema.js";
import { isLikelyBinary } from "./binary-detect.js";
import { ProjectDiscoveryError } from "./errors.js";
import { createLineMap } from "./line-map.js";
import type { ProjectModel, SkippedFile } from "./model.js";
import { assertInsideRoot, normalizeRoot, toProjectRelativePath } from "./path-safety.js";
import type { SourceFile } from "./source-file.js";
import { languageForPath } from "./source-file.js";

interface DiscoverProjectOptions {
  root?: string;
  inputs?: string[];
  config?: ResolvedConfig;
}

export function discoverProject(options: DiscoverProjectOptions = {}): ProjectModel {
  const root = normalizeRoot(options.root ?? process.cwd());
  const config = options.config ?? defaultConfig;
  const inputs = options.inputs && options.inputs.length > 0 ? options.inputs : ["."];
  const skippedFiles: SkippedFile[] = [];
  const discovered = new Set<string>();

  for (const input of inputs) {
    const absoluteInput = assertInsideRoot(resolve(root, input), root);
    if (!existsSync(absoluteInput)) {
      throw new ProjectDiscoveryError("INPUT_NOT_FOUND", absoluteInput, `Input path does not exist: ${absoluteInput}`);
    }

    const inputLstat = lstatSync(absoluteInput);
    if (inputLstat.isSymbolicLink()) {
      if (!config.analysis.followSymlinks) {
        skippedFiles.push({ path: toProjectRelativePath(absoluteInput, root), reason: "symlink" });
        continue;
      }

      assertInsideRoot(realpathSync(absoluteInput), root);
    }

    const inputStat = statSync(absoluteInput);

    if (inputStat.isDirectory()) {
      for (const match of discoverDirectory(absoluteInput, root, config)) {
        discovered.add(match);
      }
      continue;
    }

    if (inputStat.isFile() && isIncludedFile(absoluteInput, root, config)) {
      discovered.add(absoluteInput);
    }
  }

  const files: SourceFile[] = [];
  for (const path of [...discovered].sort()) {
    const loaded = loadSourceFile(path, root, config, skippedFiles);
    if (loaded) {
      files.push(loaded);
    }
  }

  return { root, config, files, skippedFiles };
}

function discoverDirectory(directory: string, root: string, config: ResolvedConfig): string[] {
  const cwd = directory;
  const matches = fg.sync(config.analysis.includePatterns, {
    cwd,
    absolute: true,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: config.analysis.followSymlinks,
    ignore: config.analysis.excludePatterns,
    unique: true,
  });

  return matches.filter((path) => isIncludedFile(path, root, config));
}

function isIncludedFile(path: string, root: string, config: ResolvedConfig): boolean {
  assertInsideRoot(path, root);
  if (config.analysis.followSymlinks) {
    assertInsideRoot(realpathSync(path), root);
  }

  const relativePath = toProjectRelativePath(path, root);
  return (
    config.analysis.includePatterns.some((pattern) => minimatch(relativePath, pattern, { dot: true })) &&
    !config.analysis.excludePatterns.some((pattern) => minimatch(relativePath, pattern, { dot: true }))
  );
}

function loadSourceFile(
  path: string,
  root: string,
  config: ResolvedConfig,
  skippedFiles: SkippedFile[]
): SourceFile | undefined {
  const stat = statSync(path);
  if (config.analysis.followSymlinks) {
    assertInsideRoot(realpathSync(path), root);
  }

  const maxBytes = config.analysis.maxFileSizeKb * 1024;
  const relativePath = toProjectRelativePath(path, root);

  if (stat.size > maxBytes) {
    throw new ProjectDiscoveryError("FILE_TOO_LARGE", path, `File exceeds max_file_size_kb: ${relativePath}`);
  }

  const buffer = readFileSync(path);
  if (isLikelyBinary(buffer)) {
    skippedFiles.push({ path: relativePath, reason: "binary" });
    return undefined;
  }

  const text = buffer.toString("utf8");
  return {
    absolutePath: path,
    relativePath,
    text,
    language: languageForPath(path),
    sizeBytes: stat.size,
    lineMap: createLineMap(text),
  };
}
