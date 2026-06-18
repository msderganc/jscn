import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { parse } from "smol-toml";

import { defaultConfig, defaultConfigFileName } from "./defaults.js";
import type { ConfigFile, ConfigOverrides, OutputFormat, ResolvedConfig } from "./schema.js";
import { ConfigValidationError, validateConfig } from "./schema.js";

interface LoadConfigOptions {
  cwd?: string;
  configPath?: string;
  overrides?: ConfigOverrides;
}

interface LoadedConfig {
  config: ResolvedConfig;
  configPath?: string;
}

export function loadConfig(options: LoadConfigOptions = {}): LoadedConfig {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = options.configPath ? resolve(cwd, options.configPath) : discoverConfig(cwd);
  const fileConfig = configPath ? readConfigFile(configPath) : {};
  const config = mergeConfig(defaultConfig, fileConfig, options.overrides ?? {});

  validateConfig(config);

  return { config, configPath };
}

function discoverConfig(cwd: string, fileName = defaultConfigFileName): string | undefined {
  let current = resolve(cwd);

  while (true) {
    const candidate = join(current, fileName);
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

function readConfigFile(path: string): ConfigFile {
  if (!existsSync(path)) {
    throw new ConfigValidationError([`config file not found: ${path}`]);
  }

  const parsed = parse(readFileSync(path, "utf8"));
  return normalizeConfigFile(parsed);
}

function mergeConfig(...configs: Array<ConfigFile | ResolvedConfig>): ResolvedConfig {
  const merged: ResolvedConfig = structuredClone(defaultConfig);

  for (const config of configs) {
    if (config.output) {
      merged.output = { ...merged.output, ...config.output };
    }

    if (config.analysis) {
      merged.analysis = { ...merged.analysis, ...config.analysis };
    }

    if (config.complexity) {
      merged.complexity = { ...merged.complexity, ...config.complexity };
    }

    if (config.dependencies) {
      merged.dependencies = { ...merged.dependencies, ...config.dependencies };
    }
  }

  return merged;
}

function resolveConfigPath(cwd: string, path: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

function normalizeConfigFile(value: unknown): ConfigFile {
  if (!isRecord(value)) {
    throw new ConfigValidationError(["config root must be a TOML table"]);
  }

  return {
    output: normalizeOutput(value.output),
    analysis: normalizeAnalysis(value.analysis),
    complexity: normalizeComplexity(value.complexity),
    dependencies: normalizeDependencies(value.dependencies),
  };
}

function normalizeOutput(value: unknown): ConfigFile["output"] {
  if (value === undefined) {
    return undefined;
  }

  assertRecord(value, "output");
  return compact({
    format: stringValue(value.format, "output.format") as OutputFormat | undefined,
    directory: stringValue(value.directory, "output.directory"),
  });
}

function normalizeAnalysis(value: unknown): ConfigFile["analysis"] {
  if (value === undefined) {
    return undefined;
  }

  assertRecord(value, "analysis");
  return compact({
    recursive: booleanValue(value.recursive, "analysis.recursive"),
    followSymlinks: booleanValue(value.follow_symlinks, "analysis.follow_symlinks"),
    includePatterns: stringArrayValue(value.include_patterns, "analysis.include_patterns"),
    excludePatterns: stringArrayValue(value.exclude_patterns, "analysis.exclude_patterns"),
    maxFileSizeKb: integerValue(value.max_file_size_kb, "analysis.max_file_size_kb"),
  });
}

function normalizeComplexity(value: unknown): ConfigFile["complexity"] {
  if (value === undefined) {
    return undefined;
  }

  assertRecord(value, "complexity");
  return compact({
    enabled: booleanValue(value.enabled, "complexity.enabled"),
    lowThreshold: integerValue(value.low_threshold, "complexity.low_threshold"),
    mediumThreshold: integerValue(value.medium_threshold, "complexity.medium_threshold"),
    maxComplexity: integerValue(value.max_complexity, "complexity.max_complexity"),
    reportUnchanged: booleanValue(value.report_unchanged, "complexity.report_unchanged"),
  });
}

function normalizeDependencies(value: unknown): ConfigFile["dependencies"] {
  if (value === undefined) {
    return undefined;
  }

  assertRecord(value, "dependencies");
  return compact({
    enabled: booleanValue(value.enabled, "dependencies.enabled"),
    includeTypeOnly: booleanValue(value.include_type_only, "dependencies.include_type_only"),
    includeExternal: booleanValue(value.include_external, "dependencies.include_external"),
    maxCycles: integerValue(value.max_cycles, "dependencies.max_cycles"),
  });
}

function assertRecord(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ConfigValidationError([`${name} must be a TOML table`]);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ConfigValidationError([`${name} must be a string`]);
  }

  return value;
}

function booleanValue(value: unknown, name: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ConfigValidationError([`${name} must be a boolean`]);
  }

  return value;
}

function integerValue(value: unknown, name: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ConfigValidationError([`${name} must be an integer`]);
  }

  return value;
}

function stringArrayValue(value: unknown, name: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ConfigValidationError([`${name} must be a string array`]);
  }

  return value;
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}
