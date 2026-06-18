import type { SourcePosition } from "../core/source-position.js";
import { isAstNode, type AstNode } from "./ast.js";
import { parseSourceFile } from "./estree/parse.js";
import type { ProjectModel } from "./model.js";

interface ControlFlowModel {
  unreachable: ControlFlowFact[];
}

interface ControlFlowFact {
  file: string;
  loc: SourcePosition;
  reason: "after-return" | "after-throw" | "after-break" | "after-continue";
}

export function buildControlFlowModel(project: ProjectModel): ControlFlowModel {
  const unreachable: ControlFlowFact[] = [];
  for (const file of project.files) {
    scanStatements((parseSourceFile(file) as AstNode).body ?? [], file.relativePath, unreachable);
  }
  return { unreachable };
}

function scanStatements(statements: unknown[], file: string, facts: ControlFlowFact[]): void {
  let terminal: ControlFlowFact["reason"] | undefined;
  for (const statement of statements) {
    if (!isAstNode(statement)) {
      continue;
    }
    if (terminal) {
      facts.push({ file, loc: sourcePosition(statement), reason: terminal });
    }
    terminal = terminal ?? terminalReason(statement);
    for (const key of ["body", "consequent", "alternate", "finalizer"]) {
      const value = statement[key];
      if (Array.isArray(value)) {
        scanStatements(value, file, facts);
      } else if (isAstNode(value) && Array.isArray(value.body)) {
        scanStatements(value.body, file, facts);
      }
    }
  }
}

function terminalReason(node: AstNode): ControlFlowFact["reason"] | undefined {
  if (node.type === "ReturnStatement") return "after-return";
  if (node.type === "ThrowStatement") return "after-throw";
  if (node.type === "BreakStatement") return "after-break";
  if (node.type === "ContinueStatement") return "after-continue";
  return undefined;
}

function sourcePosition(node: AstNode): SourcePosition {
  return { line: node.loc?.start?.line ?? 1, column: (node.loc?.start?.column ?? 0) + 1 };
}
