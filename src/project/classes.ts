import type { SourcePosition } from "../core/source-position.js";
import { isAstNode, nodeName, traverseAst, type AstNode } from "./ast.js";
import { parseSourceFile } from "./estree/parse.js";
import type { ProjectModel } from "./model.js";

interface ClassModel {
  classes: ClassSummary[];
}

interface ClassSummary {
  name: string;
  file: string;
  start: SourcePosition;
  methods: string[];
  fields: string[];
  extends?: string;
  implements: string[];
}

export function buildClassModel(project: ProjectModel): ClassModel {
  const classes: ClassSummary[] = [];
  for (const file of project.files) {
    traverseAst(parseSourceFile(file), (node, parent) => {
      if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
        const assignedName =
          nodeName(node.id) ??
          (parent?.type === "VariableDeclarator" ? nodeName(parent.id) : undefined) ??
          (parent?.type === "AssignmentExpression" ? nodeName(parent.left) : undefined);
        if (!assignedName) {
          return;
        }
        classes.push({
          name: assignedName,
          file: file.relativePath,
          start: sourcePosition(node),
          methods: classMembers(node, "MethodDefinition"),
          fields: classMembers(node, "PropertyDefinition"),
          extends: nodeName(node.superClass),
          implements: (node.implements ?? []).map((item: AstNode) => nodeName(item.expression)).filter(Boolean),
        });
      }
    });
  }
  return { classes };
}

function classMembers(node: AstNode, type: string): string[] {
  return (node.body?.body ?? [])
    .filter((member: unknown) => isAstNode(member) && member.type === type)
    .map((member: AstNode) => nodeName(member.key))
    .filter(Boolean);
}

function sourcePosition(node: AstNode): SourcePosition {
  return { line: node.loc?.start?.line ?? 1, column: (node.loc?.start?.column ?? 0) + 1 };
}
