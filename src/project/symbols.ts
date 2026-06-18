import type { SourcePosition } from "../core/source-position.js";
import { nodeName, traverseAst, type AstNode } from "./ast.js";
import { parseSourceFile } from "./estree/parse.js";
import type { ProjectModel } from "./model.js";

interface SymbolModel {
  declarations: SymbolFact[];
  references: SymbolFact[];
}

interface SymbolFact {
  name: string;
  file: string;
  loc: SourcePosition;
  exported: boolean;
  imported: boolean;
}

export function buildSymbolModel(project: ProjectModel): SymbolModel {
  const declarations: SymbolFact[] = [];
  const references: SymbolFact[] = [];
  for (const file of project.files) {
    const ast = parseSourceFile(file);
    const exportedNames = collectExportedNames(ast);
    traverseAst(ast, (node, parent) => {
      if (isDeclaration(node, parent)) {
        const name = nodeName(node.id ?? node.local);
        if (name) declarations.push(fact(name, file.relativePath, node, isExport(parent) || exportedNames.has(name), isImport(node, parent)));
      } else if (node.type === "Identifier" && !isDeclarationIdentifier(node, parent)) {
        references.push(fact(node.name, file.relativePath, node, false, false));
      }
    });
  }
  return { declarations, references };
}

function isDeclaration(node: AstNode, parent?: AstNode): boolean {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "ClassDeclaration" ||
    node.type === "VariableDeclarator" ||
    node.type === "ImportSpecifier" ||
    node.type === "ImportDefaultSpecifier" ||
    node.type === "ImportNamespaceSpecifier"
  );
}

function isDeclarationIdentifier(node: AstNode, parent?: AstNode): boolean {
  return parent?.id === node || parent?.local === node || parent?.key === node;
}

function isExport(parent?: AstNode): boolean {
  return parent?.type?.startsWith("Export") ?? false;
}

function isImport(node: AstNode, parent?: AstNode): boolean {
  return node.type.startsWith("Import") || (parent?.type?.startsWith("Import") ?? false);
}

function collectExportedNames(ast: unknown): Set<string> {
  const names = new Set<string>();
  traverseAst(ast, (node) => {
    if (node.type !== "ExportNamedDeclaration" && node.type !== "ExportDefaultDeclaration") {
      return;
    }

    const declaration = node.declaration;
    if (declaration?.type === "VariableDeclaration") {
      for (const item of declaration.declarations ?? []) {
        const name = nodeName(item.id);
        if (name) names.add(name);
      }
      return;
    }

    const declarationName = nodeName(declaration?.id);
    if (declarationName) names.add(declarationName);

    for (const specifier of node.specifiers ?? []) {
      const localName = nodeName(specifier.local ?? specifier.exported);
      if (localName) names.add(localName);
    }
  });
  return names;
}

function fact(name: string, file: string, node: AstNode, exported: boolean, imported: boolean): SymbolFact {
  return { name, file, loc: { line: node.loc?.start?.line ?? 1, column: (node.loc?.start?.column ?? 0) + 1 }, exported, imported };
}
