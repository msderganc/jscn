import { minimatch } from "minimatch";

import type { ArchitectureReport, DependencyReport, Issue } from "../core/schema.js";

export function analyzeArchitecture(dependencies: DependencyReport): ArchitectureReport {
  const violations = dependencies.edges
    .filter((edge) => edge.resolved && forbiddenImport(edge.from, edge.to))
    .map<Issue>((edge) => ({
      id: `architecture:forbidden:${edge.from}:${edge.to}`,
      analyzer: "architecture",
      severity: "warning",
      message: `Architecture boundary violation: ${edge.from} imports ${edge.to}`,
      file: edge.from,
      start: edge.loc,
      rule: "architecture.forbidden_import",
      details: { from: edge.from, to: edge.to, specifier: edge.specifier },
    }));
  return { violations };
}

export function architectureIssues(report: ArchitectureReport): Issue[] {
  return report.violations;
}

function forbiddenImport(from: string, to: string): boolean {
  return minimatch(from, "src/domain/**") && minimatch(to, "src/infra/**");
}
