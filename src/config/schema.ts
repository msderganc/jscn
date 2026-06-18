export type OutputFormat = "text" | "json" | "yaml" | "csv" | "html";

export interface OutputConfig {
  format: OutputFormat;
  directory: string;
}

export interface AnalysisConfig {
  recursive: boolean;
  followSymlinks: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSizeKb: number;
}

export interface ComplexityConfig {
  enabled: boolean;
  lowThreshold: number;
  mediumThreshold: number;
  maxComplexity: number;
  reportUnchanged: boolean;
}

export interface DependenciesConfig {
  enabled: boolean;
  includeTypeOnly: boolean;
  includeExternal: boolean;
  maxCycles: number;
}

export interface DeadCodeConfig {
  reportIntentionalUnused: boolean;
}

export interface DiConfig {
  containerNames: string[];
  lookupMethods: string[];
  compositionRoots: string[];
}

export interface ClonesConfig {
  includeTestBoilerplate: boolean;
  minNormalizedChars: number;
  minNonImportChars: number;
}

export interface ResolvedConfig {
  output: OutputConfig;
  analysis: AnalysisConfig;
  complexity: ComplexityConfig;
  dependencies: DependenciesConfig;
  deadCode: DeadCodeConfig;
  di: DiConfig;
  clones: ClonesConfig;
}

export type ConfigFile = {
  output?: Partial<OutputConfig>;
  analysis?: Partial<AnalysisConfig>;
  complexity?: Partial<ComplexityConfig>;
  dependencies?: Partial<DependenciesConfig>;
  deadCode?: Partial<DeadCodeConfig>;
  di?: Partial<DiConfig>;
  clones?: Partial<ClonesConfig>;
};

export type ConfigOverrides = ConfigFile;

export class ConfigValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid jscn configuration: ${issues.join("; ")}`);
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

export function validateConfig(config: ResolvedConfig): void {
  const issues: string[] = [];

  if (!["text", "json", "yaml", "csv", "html"].includes(config.output.format)) {
    issues.push("output.format must be one of text, json, yaml, csv, or html");
  }

  if (!config.output.directory) {
    issues.push("output.directory must not be empty");
  }

  if (!Array.isArray(config.analysis.includePatterns) || config.analysis.includePatterns.some((value) => !value)) {
    issues.push("analysis.include_patterns must be a non-empty string array");
  }

  if (!Array.isArray(config.analysis.excludePatterns)) {
    issues.push("analysis.exclude_patterns must be a string array");
  }

  if (!Number.isInteger(config.analysis.maxFileSizeKb) || config.analysis.maxFileSizeKb <= 0) {
    issues.push("analysis.max_file_size_kb must be a positive integer");
  }

  if (!Number.isInteger(config.complexity.lowThreshold) || config.complexity.lowThreshold < 1) {
    issues.push("complexity.low_threshold must be a positive integer");
  }

  if (
    !Number.isInteger(config.complexity.mediumThreshold) ||
    config.complexity.mediumThreshold < config.complexity.lowThreshold
  ) {
    issues.push("complexity.medium_threshold must be greater than or equal to low_threshold");
  }

  if (!Number.isInteger(config.complexity.maxComplexity) || config.complexity.maxComplexity < 0) {
    issues.push("complexity.max_complexity must be a non-negative integer");
  }

  if (!Number.isInteger(config.dependencies.maxCycles) || config.dependencies.maxCycles < 0) {
    issues.push("dependencies.max_cycles must be a non-negative integer");
  }

  if (!Array.isArray(config.di.containerNames) || config.di.containerNames.length === 0 || config.di.containerNames.some((value) => !value)) {
    issues.push("di.container_names must be a non-empty string array");
  }

  if (!Array.isArray(config.di.lookupMethods) || config.di.lookupMethods.length === 0 || config.di.lookupMethods.some((value) => !value)) {
    issues.push("di.lookup_methods must be a non-empty string array");
  }

  if (!Array.isArray(config.di.compositionRoots) || config.di.compositionRoots.length === 0 || config.di.compositionRoots.some((value) => !value)) {
    issues.push("di.composition_roots must be a non-empty string array");
  }

  if (!Number.isInteger(config.clones.minNormalizedChars) || config.clones.minNormalizedChars < 1) {
    issues.push("clones.min_normalized_chars must be a positive integer");
  }

  if (!Number.isInteger(config.clones.minNonImportChars) || config.clones.minNonImportChars < 0) {
    issues.push("clones.min_non_import_chars must be a non-negative integer");
  }

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }
}
