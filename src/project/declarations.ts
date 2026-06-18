import type { SourcePosition } from "../core/source-position.js";
import type { ProjectModel } from "./model.js";
import { parseSourceFile } from "./estree/parse.js";

export type DeclarationKind =
  | "function"
  | "function-expression"
  | "arrow-function"
  | "method"
  | "constructor"
  | "class-field-function";

export interface NormalizedDeclaration {
  name: string;
  kind: DeclarationKind;
  file: string;
  start: SourcePosition;
  end?: SourcePosition;
  branches: BranchPoint[];
}

export interface BranchPoint {
  kind:
    | "if"
    | "loop"
    | "catch"
    | "conditional"
    | "logical"
    | "switch-case";
  depth: number;
}

export function extractDeclarations(project: ProjectModel): NormalizedDeclaration[] {
  return project.files.flatMap((file) => {
    const ast = parseSourceFile(file);
    const declarations: NormalizedDeclaration[] = [];

    traverse(ast, (node, parent) => {
      switch (node.type) {
        case "FunctionDeclaration":
          declarations.push(createDeclaration(node, "function", file.relativePath, node.id?.name ?? "<anonymous>"));
          return true;
        case "FunctionExpression":
          if (parent?.type === "MethodDefinition") {
            return false;
          }
          declarations.push(
            createDeclaration(
              node,
              parent?.type === "PropertyDefinition" ? "class-field-function" : "function-expression",
              file.relativePath,
              nameFromParent(parent)
            )
          );
          return true;
        case "ArrowFunctionExpression":
          if (parent?.type === "PropertyDefinition") {
            declarations.push(createDeclaration(node, "class-field-function", file.relativePath, nameFromKey(parent.key)));
          } else {
            declarations.push(createDeclaration(node, "arrow-function", file.relativePath, nameFromParent(parent)));
          }
          return true;
        case "MethodDefinition":
          declarations.push(
            createDeclaration(
              node.value,
              node.kind === "constructor" ? "constructor" : "method",
              file.relativePath,
              node.kind === "constructor" ? "constructor" : nameFromKey(node.key)
            )
          );
          return false;
        default:
          return true;
      }
    });

    return declarations;
  });
}

function createDeclaration(node: AstNode, kind: DeclarationKind, file: string, name: string): NormalizedDeclaration {
  return {
    name,
    kind,
    file,
    start: toPosition(node.loc?.start),
    end: node.loc?.end ? toPosition(node.loc.end) : undefined,
    branches: extractBranchPoints(node.body),
  };
}

function extractBranchPoints(body: unknown): BranchPoint[] {
  const branches: BranchPoint[] = [];

  traverseBody(body, (node, depth) => {
    const kind = branchKind(node);
    if (kind) {
      branches.push({ kind, depth });
    }
  });

  return branches;
}

function branchKind(node: AstNode): BranchPoint["kind"] | undefined {
  switch (node.type) {
    case "IfStatement":
      return "if";
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "WhileStatement":
    case "DoWhileStatement":
      return "loop";
    case "CatchClause":
      return "catch";
    case "ConditionalExpression":
      return "conditional";
    case "LogicalExpression":
      return node.operator === "&&" || node.operator === "||" || node.operator === "??" ? "logical" : undefined;
    case "SwitchCase":
      return node.test ? "switch-case" : undefined;
    default:
      return undefined;
  }
}

function nameFromParent(parent: AstNode | undefined): string {
  if (!parent) {
    return "<anonymous>";
  }

  if (parent.type === "VariableDeclarator") {
    return nameFromKey(parent.id);
  }

  if (parent.type === "AssignmentExpression") {
    return nameFromKey(parent.left);
  }

  if (parent.type === "Property" || parent.type === "PropertyDefinition") {
    return nameFromKey(parent.key);
  }

  return "<anonymous>";
}

function nameFromKey(node: AstNode | undefined): string {
  if (!node) {
    return "<anonymous>";
  }

  if (node.type === "Identifier") {
    return node.name ?? "<anonymous>";
  }

  if (node.type === "Literal") {
    return String(node.value);
  }

  if (node.type === "PrivateIdentifier") {
    return `#${node.name ?? "private"}`;
  }

  if (node.type === "MemberExpression") {
    return `${nameFromKey(node.object)}.${nameFromKey(node.property)}`;
  }

  return "<computed>";
}

function toPosition(loc: { line: number; column: number } | undefined): SourcePosition {
  return { line: loc?.line ?? 1, column: (loc?.column ?? 0) + 1 };
}

function traverse(node: unknown, visit: (node: AstNode, parent: AstNode | undefined) => boolean | void, parent?: AstNode): void {
  if (!isAstNode(node)) {
    return;
  }

  if (visit(node, parent) === false) {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent" || key === "loc" || key === "range" || key === "tokens" || key === "comments") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        traverse(item, visit, node);
      }
    } else {
      traverse(value, visit, node);
    }
  }
}

function traverseBody(node: unknown, visit: (node: AstNode, depth: number) => void, depth = 0): void {
  if (!isAstNode(node)) {
    return;
  }

  if (isFunctionLike(node)) {
    return;
  }

  const nextDepth = isNestingNode(node) ? depth + 1 : depth;
  visit(node, nextDepth);

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent" || key === "loc" || key === "range" || key === "tokens" || key === "comments") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        traverseBody(item, visit, nextDepth);
      }
    } else {
      traverseBody(value, visit, nextDepth);
    }
  }
}

function isFunctionLike(node: AstNode): boolean {
  return node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression";
}

function isNestingNode(node: AstNode): boolean {
  return [
    "BlockStatement",
    "IfStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    "WhileStatement",
    "DoWhileStatement",
    "SwitchStatement",
    "CatchClause",
  ].includes(node.type);
}

function isAstNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

type AstNode = Record<string, any>;
