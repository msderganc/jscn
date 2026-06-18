import type { ComplexityReport, FunctionComplexity, Issue } from "../core/schema.js";
import type { NormalizedDeclaration } from "../project/declarations.js";
import { extractDeclarations } from "../project/declarations.js";
import type { ProjectModel } from "../project/model.js";
import type { ResolvedConfig } from "../config/schema.js";
import type { Analyzer } from "./types.js";

const complexityAnalyzer: Analyzer<ComplexityReport> = {
  name: "complexity",
  requires: ["syntax"],
  async run(project: ProjectModel, config: ResolvedConfig): Promise<ComplexityReport> {
    return analyzeComplexity(project, config);
  },
};

export function analyzeComplexity(project: ProjectModel, config: ResolvedConfig): ComplexityReport {
  const functions = analyzeAllComplexity(project, config)
    .filter((result) => result.metrics.complexity >= config.complexity.lowThreshold || config.complexity.reportUnchanged);

  const complexities = functions.map((result) => result.metrics.complexity);
  return {
    functions,
    averageComplexity:
      complexities.length === 0 ? 0 : complexities.reduce((total, value) => total + value, 0) / complexities.length,
    maxComplexity: complexities.length === 0 ? 0 : Math.max(...complexities),
    minComplexity: complexities.length === 0 ? 0 : Math.min(...complexities),
  };
}

export function analyzeAllComplexity(project: ProjectModel, config: ResolvedConfig): FunctionComplexity[] {
  return extractDeclarations(project).map((declaration) => analyzeDeclaration(declaration, config));
}

export function complexityIssues(report: ComplexityReport, config: ResolvedConfig): Issue[] {
  if (config.complexity.maxComplexity === 0) {
    return [];
  }

  return report.functions
    .filter((entry) => entry.metrics.complexity > config.complexity.maxComplexity)
    .map((entry) => ({
      id: `complexity:${entry.file}:${entry.name}:${entry.start.line}`,
      analyzer: "complexity",
      severity: "warning",
      message: `${entry.name} has cyclomatic complexity ${entry.metrics.complexity}`,
      file: entry.file,
      start: entry.start,
      end: entry.end,
      symbol: entry.name,
      rule: "complexity.max_complexity",
      details: { complexity: entry.metrics.complexity, maxComplexity: config.complexity.maxComplexity },
    }));
}

function analyzeDeclaration(declaration: NormalizedDeclaration, config: ResolvedConfig): FunctionComplexity {
  const metrics = measureComplexity(declaration);
  return {
    name: declaration.name,
    file: declaration.file,
    start: declaration.start,
    end: declaration.end,
    metrics,
    riskLevel: riskLevel(metrics.complexity, config),
  };
}

function measureComplexity(declaration: Pick<NormalizedDeclaration, "branches">): FunctionComplexity["metrics"] {
  const branchCount = declaration.branches.length;
  const maxNestingDepth = declaration.branches.reduce((max, branch) => Math.max(max, branch.depth), 0);
  const complexity = 1 + branchCount;

  return {
    complexity,
    cognitiveComplexity: complexity + maxNestingDepth,
    nestingDepth: maxNestingDepth,
    branchCount,
  };
}

function riskLevel(complexity: number, config: ResolvedConfig): FunctionComplexity["riskLevel"] {
  if (complexity >= config.complexity.mediumThreshold) {
    return "high";
  }

  if (complexity >= config.complexity.lowThreshold) {
    return "medium";
  }

  return "low";
}

function minimumReportedComplexity(config: ResolvedConfig): number {
  return config.complexity.reportUnchanged ? 1 : config.complexity.lowThreshold;
}
