import type { Severity } from "./severity.js";
import type { SourcePosition } from "./source-position.js";

export interface Issue {
  id: string;
  analyzer: string;
  severity: Severity;
  message: string;
  file?: string;
  start?: SourcePosition;
  end?: SourcePosition;
  symbol?: string;
  rule: string;
  details?: Record<string, unknown>;
}

export interface AnalysisSummary {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  totalIssues: number;
  issueCounts: Record<Severity, number>;
  qualityIssueCount: number;
}

export interface ComplexityMetrics {
  complexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  branchCount: number;
}

export interface FunctionComplexity {
  name: string;
  file: string;
  start: SourcePosition;
  end?: SourcePosition;
  metrics: ComplexityMetrics;
  riskLevel: "low" | "medium" | "high";
}

export interface ComplexityReport {
  functions: FunctionComplexity[];
  averageComplexity: number;
  maxComplexity: number;
  minComplexity: number;
}

export type DependencyEdgeKind =
  | "runtime"
  | "type-only"
  | "export-from"
  | "require"
  | "dynamic"
  | "external"
  | "unresolved";

export interface DependencyEdge {
  from: string;
  to: string;
  specifier: string;
  kind: DependencyEdgeKind;
  resolved: boolean;
  external: boolean;
  loc?: SourcePosition;
}

export interface DependencyCycle {
  files: string[];
  edgeKinds: DependencyEdgeKind[];
}

export interface DependencyReport {
  edges: DependencyEdge[];
  cycles: DependencyCycle[];
}

export interface DeadCodeReport {
  unreachable: Issue[];
  unused: Issue[];
}

export interface CloneReport {
  groups: unknown[];
}

export interface CouplingReport {
  modules: unknown[];
  classes: unknown[];
}

export interface CohesionReport {
  classes: unknown[];
}

export interface ArchitectureReport {
  violations: Issue[];
}

export interface DiReport {
  issues: Issue[];
}

export interface MockDataReport {
  issues: Issue[];
}

export interface AnalysisResult {
  version: string;
  generatedAt: string;
  durationMs: number;
  root: string;
  configPath?: string;
  summary: AnalysisSummary;
  issues: Issue[];
  analyses: {
    complexity?: ComplexityReport;
    dependencies?: DependencyReport;
    deadCode?: DeadCodeReport;
    clones?: CloneReport;
    coupling?: CouplingReport;
    cohesion?: CohesionReport;
    architecture?: ArchitectureReport;
    di?: DiReport;
    mockData?: MockDataReport;
  };
}
