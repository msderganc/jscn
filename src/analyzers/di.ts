import type { DiReport, Issue } from "../core/schema.js";
import { traverseAst } from "../project/ast.js";
import { parseSourceFile } from "../project/estree/parse.js";
import type { ProjectModel } from "../project/model.js";

export function analyzeDi(project: ProjectModel): DiReport {
  const issues: Issue[] = [];
  for (const file of project.files) {
    if (isCompositionRoot(file.relativePath)) {
      continue;
    }
    traverseAst(parseSourceFile(file), (node) => {
      if (node.type === "CallExpression" && node.callee?.type === "MemberExpression" && node.callee.property?.name === "get") {
        issues.push({
          id: `di:container-get:${file.relativePath}:${node.loc?.start?.line ?? 1}`,
          analyzer: "di",
          severity: "warning",
          message: "Container lookup outside composition root",
          file: file.relativePath,
          start: { line: node.loc?.start?.line ?? 1, column: (node.loc?.start?.column ?? 0) + 1 },
          rule: "di.container_lookup",
        });
      }
    });
  }
  return { issues };
}

export function diIssues(report: DiReport): Issue[] {
  return report.issues;
}

function isCompositionRoot(path: string): boolean {
  return /(^|\/)(main|bootstrap|composition-root)\.[cm]?[jt]sx?$/.test(path);
}
