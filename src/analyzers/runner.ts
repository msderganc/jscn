import type { ResolvedConfig } from "../config/schema.js";
import { version } from "../index.js";
import type { ProjectModel } from "../project/model.js";
import { createAnalysisResult } from "../core/result.js";
import type { AnalysisResult, Issue } from "../core/schema.js";
import { analyzeAllComplexity, analyzeComplexity, complexityIssues } from "./complexity.js";
import { analyzeDependencies } from "./dependencies.js";
import { analyzeDeadCode, deadCodeIssues } from "./dead-code.js";
import { analyzeClones, cloneIssues } from "./clones.js";
import { analyzeCoupling, couplingIssues } from "./coupling.js";
import { analyzeCohesion, cohesionIssues } from "./cohesion.js";
import { analyzeArchitecture, architectureIssues } from "./architecture.js";
import { analyzeDi, diIssues } from "./di.js";
import { analyzeMockData, mockDataIssues } from "./mock-data.js";

interface RunAnalysisOptions {
  project: ProjectModel;
  config: ResolvedConfig;
  configPath?: string;
  selectedAnalyzers: string[];
  generatedAt: string;
  startedAtMs: number;
  endedAtMs: number;
}

export function runAnalysis(options: RunAnalysisOptions): AnalysisResult {
  const analyses: AnalysisResult["analyses"] = {};
  const issues: Issue[] = [];

  if (options.selectedAnalyzers.includes("complexity") && options.config.complexity.enabled) {
    const complexity = analyzeComplexity(options.project, options.config);
    const allComplexity = { ...complexity, functions: analyzeAllComplexity(options.project, options.config) };
    analyses.complexity = complexity;
    issues.push(...complexityIssues(allComplexity, options.config));
  }

  const needsDependencies = options.selectedAnalyzers.some((item) => item === "deps" || item === "coupling" || item === "cbo" || item === "architecture");
  let dependencyReport: ReturnType<typeof analyzeDependencies> | undefined;

  if (needsDependencies && options.config.dependencies.enabled) {
    const dependencies = analyzeDependencies(options.project, {
      includeTypeOnly: options.config.dependencies.includeTypeOnly,
      includeExternal: options.config.dependencies.includeExternal,
    });
    dependencyReport = dependencies;
    if (options.selectedAnalyzers.includes("deps")) {
      analyses.dependencies = dependencies;
    }
    if (options.config.dependencies.maxCycles >= 0 && dependencies.cycles.length > options.config.dependencies.maxCycles) {
      issues.push(
        ...dependencies.cycles.map((cycle, index) => ({
          id: `deps:cycle:${index + 1}`,
          analyzer: "deps",
          severity: "warning" as const,
          message: `Circular dependency detected: ${cycle.files.join(" -> ")}`,
          file: cycle.files[0],
          rule: "dependencies.max_cycles",
          details: { files: cycle.files },
        }))
      );
    }
  }

  if (options.selectedAnalyzers.includes("deadcode")) {
    const deadCode = analyzeDeadCode(options.project);
    analyses.deadCode = deadCode;
    issues.push(...deadCodeIssues(deadCode));
  }

  if (options.selectedAnalyzers.includes("clones")) {
    const clones = analyzeClones(options.project);
    analyses.clones = clones;
    issues.push(...cloneIssues(clones));
  }

  if (options.selectedAnalyzers.includes("coupling") || options.selectedAnalyzers.includes("cbo")) {
    const coupling = analyzeCoupling(dependencyReport ?? analyzeDependencies(options.project, { includeTypeOnly: true, includeExternal: false }));
    analyses.coupling = coupling;
    issues.push(...couplingIssues(coupling));
  }

  if (options.selectedAnalyzers.includes("cohesion") || options.selectedAnalyzers.includes("lcom")) {
    const cohesion = analyzeCohesion(options.project);
    analyses.cohesion = cohesion;
    issues.push(...cohesionIssues(cohesion));
  }

  if (options.selectedAnalyzers.includes("architecture")) {
    const architecture = analyzeArchitecture(dependencyReport ?? analyzeDependencies(options.project, { includeTypeOnly: true, includeExternal: false }));
    analyses.architecture = architecture;
    issues.push(...architectureIssues(architecture));
  }

  if (options.selectedAnalyzers.includes("di")) {
    const di = analyzeDi(options.project);
    analyses.di = di;
    issues.push(...diIssues(di));
  }

  if (options.selectedAnalyzers.includes("mockdata")) {
    const mockData = analyzeMockData(options.project);
    analyses.mockData = mockData;
    issues.push(...mockDataIssues(mockData));
  }

  return createAnalysisResult({
    version,
    generatedAt: options.generatedAt,
    durationMs: Math.max(0, options.endedAtMs - options.startedAtMs),
    root: options.project.root,
    configPath: options.configPath,
    issues,
    summary: {
      totalFiles: options.project.files.length + options.project.skippedFiles.length,
      analyzedFiles: options.project.files.length,
      skippedFiles: options.project.skippedFiles.length,
    },
    analyses,
  });
}

export function parseSelectedAnalyzers(value: string | undefined, skipComplexity = false, skipDeps = false): string[] {
  const selected = value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : ["complexity"];

  return selected.filter((item) => !(item === "complexity" && skipComplexity) && !(item === "deps" && skipDeps));
}

export function assertSupportedAnalyzers(selected: string[]): void {
  const supported = new Set(["complexity", "deps", "deadcode", "clones", "coupling", "cbo", "cohesion", "lcom", "architecture", "di", "mockdata"]);
  const unsupported = selected.filter((item) => !supported.has(item));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported analyzer(s) in this slice: ${unsupported.join(", ")}`);
  }
}
