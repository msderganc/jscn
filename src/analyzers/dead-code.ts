import type { Issue, DeadCodeReport } from "../core/schema.js";
import { buildControlFlowModel } from "../project/control-flow.js";
import { buildSymbolModel } from "../project/symbols.js";
import type { ProjectModel } from "../project/model.js";

export function analyzeDeadCode(project: ProjectModel): DeadCodeReport {
  const controlFlow = buildControlFlowModel(project);
  const symbols = buildSymbolModel(project);
  const referenced = new Set(symbols.references.map((item) => `${item.file}:${item.name}`));
  const unused = symbols.declarations
    .filter((item) => !item.exported && !item.imported && !referenced.has(`${item.file}:${item.name}`))
    .map<Issue>((item) => ({
      id: `deadcode:unused:${item.file}:${item.name}`,
      analyzer: "deadcode",
      severity: "warning",
      message: `Unused local declaration: ${item.name}`,
      file: item.file,
      start: item.loc,
      symbol: item.name,
      rule: "deadcode.unused",
    }));

  return {
    unreachable: controlFlow.unreachable.map((item, index) => ({
      id: `deadcode:unreachable:${index + 1}`,
      analyzer: "deadcode",
      severity: "warning",
      message: `Unreachable statement ${item.reason.replace("after-", "after ")}`,
      file: item.file,
      start: item.loc,
      rule: "deadcode.unreachable",
    })),
    unused,
  };
}

export function deadCodeIssues(report: DeadCodeReport): Issue[] {
  return [...report.unreachable, ...report.unused];
}
