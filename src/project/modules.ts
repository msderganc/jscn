import type { SourcePosition } from "../core/source-position.js";
import { nodeName, traverseAst, type AstNode } from "./ast.js";
import { parseSourceFile } from "./estree/parse.js";
import type { ProjectModel } from "./model.js";

interface ModuleModel {
  modules: ModuleSummary[];
}

interface ModuleSummary {
  file: string;
  imports: ModuleImport[];
  exports: string[];
  declarations: string[];
  topLevelCalls: string[];
  hasSideEffects: boolean;
}

interface ModuleImport {
  specifier: string;
  loc: SourcePosition;
}

export function buildModuleModel(project: ProjectModel): ModuleModel {
  return {
    modules: project.files.map((file) => {
      const summary: ModuleSummary = { file: file.relativePath, imports: [], exports: [], declarations: [], topLevelCalls: [], hasSideEffects: false };
      const ast = parseSourceFile(file) as AstNode;
      for (const node of ast.body ?? []) {
        collectTopLevel(node, summary);
      }
      return summary;
    }),
  };
}

function collectTopLevel(node: AstNode, summary: ModuleSummary): void {
  if (node.type === "ImportDeclaration" && typeof node.source?.value === "string") {
    summary.imports.push({ specifier: node.source.value, loc: sourcePosition(node) });
    return;
  }
  if (node.type.startsWith("Export")) {
    collectExport(node, summary);
    return;
  }
  if (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") {
    const name = nodeName(node.id);
    if (name) summary.declarations.push(name);
    return;
  }
  if (node.type === "VariableDeclaration") {
    for (const declaration of node.declarations ?? []) {
      const name = nodeName(declaration.id);
      if (name) summary.declarations.push(name);
    }
    return;
  }
  if (node.type === "ExpressionStatement" && node.expression?.type === "CallExpression") {
    const name = nodeName(node.expression.callee);
    if (name) summary.topLevelCalls.push(name);
    summary.hasSideEffects = true;
  }
}

function collectExport(node: AstNode, summary: ModuleSummary): void {
  if (typeof node.source?.value === "string") {
    summary.exports.push(node.source.value);
  }
  if (node.declaration) {
    const name = nodeName(node.declaration.id);
    if (name) {
      summary.declarations.push(name);
      summary.exports.push(name);
    }
    if (node.declaration.type === "VariableDeclaration") {
      for (const declaration of node.declaration.declarations ?? []) {
        const declarationName = nodeName(declaration.id);
        if (declarationName) {
          summary.declarations.push(declarationName);
          summary.exports.push(declarationName);
        }
      }
    }
  }
  for (const specifier of node.specifiers ?? []) {
    const name = nodeName(specifier.exported ?? specifier.local);
    if (name) summary.exports.push(name);
  }
}

function sourcePosition(node: AstNode): SourcePosition {
  return { line: node.loc?.start?.line ?? 1, column: (node.loc?.start?.column ?? 0) + 1 };
}
