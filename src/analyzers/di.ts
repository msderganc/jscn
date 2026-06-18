import type { DiReport, Issue } from "../core/schema.js";
import type { DiConfig } from "../config/schema.js";
import { traverseAst } from "../project/ast.js";
import { parseSourceFile } from "../project/estree/parse.js";
import type { ProjectModel } from "../project/model.js";
import { minimatch } from "minimatch";

export function analyzeDi(project: ProjectModel, config: DiConfig): DiReport {
  const issues: Issue[] = [];
  for (const file of project.files) {
    if (isCompositionRoot(file.relativePath, config)) {
      continue;
    }
    traverseAst(parseSourceFile(file), (node) => {
      const lookup = containerLookup(node, config);
      if (lookup) {
        issues.push({
          id: `di:container-get:${file.relativePath}:${node.loc?.start?.line ?? 1}`,
          analyzer: "di",
          severity: "warning",
          message: "Container lookup outside composition root",
          file: file.relativePath,
          start: { line: node.loc?.start?.line ?? 1, column: (node.loc?.start?.column ?? 0) + 1 },
          rule: "di.container_lookup",
          details: { ...lookup, compositionRootMatched: false },
        });
      }
    });
  }
  return { issues };
}

export function diIssues(report: DiReport): Issue[] {
  return report.issues;
}

function containerLookup(node: Record<string, any>, config: DiConfig): { receiver: string; method: string } | undefined {
  if (node.type !== "CallExpression" || node.callee?.type !== "MemberExpression") {
    return undefined;
  }

  const method = node.callee.property?.name;
  if (typeof method !== "string" || !config.lookupMethods.includes(method)) {
    return undefined;
  }

  const receiver = receiverName(node.callee.object);
  if (!receiver || !config.containerNames.includes(receiver)) {
    return undefined;
  }

  return { receiver, method };
}

function receiverName(node: Record<string, any> | undefined): string | undefined {
  if (!node) {
    return undefined;
  }

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "MemberExpression") {
    return receiverName(node.property);
  }

  return undefined;
}

function isCompositionRoot(path: string, config: DiConfig): boolean {
  return config.compositionRoots.some((pattern) => minimatch(path, pattern, { dot: true }));
}
