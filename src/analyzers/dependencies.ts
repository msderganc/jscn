import { normalize } from "node:path";

import type { DependencyEdge, DependencyEdgeKind, DependencyReport } from "../core/schema.js";
import type { ProjectModel } from "../project/model.js";
import { isAstNode, traverseAst, type AstNode } from "../project/ast.js";
import { parseSourceFile } from "../project/estree/parse.js";
import { createModuleResolver, type ModuleResolver } from "../project/resolution/module-resolution.js";

export function analyzeDependencies(project: ProjectModel, options: { includeTypeOnly: boolean; includeExternal: boolean }): DependencyReport {
  const resolver = createModuleResolver(project);
  const edges: DependencyEdge[] = [];

  for (const file of project.files) {
    const ast = parseSourceFile(file);
    const shadowedRequire = hasLocalRequireBinding(ast);
    traverseAst(ast, (node) => {
      const edge = edgeFromNode(node, file.relativePath, resolver, shadowedRequire);
      if (!edge) {
        return;
      }

      if (!options.includeTypeOnly && edge.kind === "type-only") {
        return;
      }

      if (!options.includeExternal && edge.external) {
        return;
      }

      edges.push(edge);
    });
  }

  return {
    edges,
    cycles: detectCycles(edges, { includeTypeOnly: options.includeTypeOnly }),
  };
}

function edgeFromNode(
  node: AstNode,
  from: string,
  resolver: ModuleResolver,
  shadowedRequire: boolean
): DependencyEdge | undefined {
  if (node.type === "ImportDeclaration") {
    const specifier = literalString(node.source);
    if (!specifier) {
      return undefined;
    }
    const kind: DependencyEdgeKind = isTypeOnlyImport(node) ? "type-only" : "runtime";
    return createEdge(from, specifier, kind, resolver, node.loc?.start);
  }

  if (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") {
    const specifier = literalString(node.source);
    if (!specifier) {
      return undefined;
    }
    return createEdge(from, specifier, isTypeOnlyExport(node) ? "type-only" : "export-from", resolver, node.loc?.start);
  }

  if (!shadowedRequire && node.type === "CallExpression" && node.callee?.type === "Identifier" && node.callee.name === "require") {
    const specifier = literalString(node.arguments?.[0]);
    if (!specifier) {
      return undefined;
    }
    return createEdge(from, specifier, "require", resolver, node.loc?.start);
  }

  if (node.type === "ImportExpression") {
    const specifier = literalString(node.source);
    if (!specifier) {
      return undefined;
    }
    return createEdge(from, specifier, "dynamic", resolver, node.loc?.start);
  }

  return undefined;
}

function createEdge(
  from: string,
  specifier: string,
  kind: DependencyEdgeKind,
  resolver: ModuleResolver,
  loc?: { line: number; column: number }
): DependencyEdge {
  const resolvedModule = resolver.resolve(from, specifier, { kind });
  const resolved = !resolvedModule.unresolved && Boolean(resolvedModule.resolvedPath);
  return {
    from,
    to: resolvedModule.resolvedPath ?? resolvedModule.packageName ?? specifier,
    specifier,
    kind: resolved ? kind : resolvedModule.external ? "external" : "unresolved",
    resolved,
    external: resolvedModule.external,
    loc: loc ? { line: loc.line, column: loc.column + 1 } : undefined,
  };
}

function isTypeOnlyImport(node: AstNode): boolean {
  const specifiers = node.specifiers ?? [];
  return node.importKind === "type" || (specifiers.length > 0 && specifiers.every((specifier: AstNode) => specifier.importKind === "type"));
}

function isTypeOnlyExport(node: AstNode): boolean {
  return node.exportKind === "type" || (node.specifiers?.length ?? 0) > 0 && node.specifiers.every((specifier: AstNode) => specifier.exportKind === "type");
}

function hasLocalRequireBinding(ast: unknown): boolean {
  let shadowed = false;
  traverseAst(ast, (node) => {
    if (
      (node.type === "FunctionDeclaration" && node.id?.name === "require") ||
      (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.id.name === "require") ||
      (node.type === "ImportSpecifier" && node.local?.name === "require") ||
      (node.type === "ImportDefaultSpecifier" && node.local?.name === "require")
    ) {
      shadowed = true;
    }
  });
  return shadowed;
}

function detectCycles(edges: DependencyEdge[], options: { includeTypeOnly: boolean }): DependencyReport["cycles"] {
  const graph = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!edge.resolved || edge.external) {
      continue;
    }
    if (!options.includeTypeOnly && edge.kind === "type-only") {
      continue;
    }
    if (!["runtime", "require", "dynamic", "export-from", "type-only"].includes(edge.kind)) {
      continue;
    }
    const targets = graph.get(edge.from) ?? new Set<string>();
    targets.add(edge.to);
    graph.set(edge.from, targets);
  }

  const cycles = new Map<string, string[]>();
  for (const start of graph.keys()) {
    visit(start, start, graph, [], cycles);
  }

  return [...cycles.values()].map((files) => ({ files, edgeKinds: edgeKindsForCycle(files, edges) }));
}

function visit(
  start: string,
  current: string,
  graph: Map<string, Set<string>>,
  path: string[],
  cycles: Map<string, string[]>
): void {
  const nextPath = [...path, current];
  for (const next of graph.get(current) ?? []) {
    if (next === start) {
      const cycle = normalizeCycle([...nextPath, start]);
      cycles.set(canonicalCycle(cycle), cycle);
      continue;
    }

    if (!path.includes(next)) {
      visit(start, next, graph, nextPath, cycles);
    }
  }
}

function canonicalCycle(cycle: string[]): string {
  const nodes = cycle.slice(0, -1);
  const rotations = nodes.map((_, index) => [...nodes.slice(index), ...nodes.slice(0, index)].join(">"));
  return rotations.sort()[0] ?? nodes.join(">");
}

function normalizeCycle(cycle: string[]): string[] {
  const nodes = cycle.slice(0, -1);
  const rotations = nodes.map((_, index) => [...nodes.slice(index), ...nodes.slice(0, index)]);
  const selected = rotations.sort((a, b) => a.join(">").localeCompare(b.join(">")))[0] ?? nodes;
  return [...selected, selected[0] ?? cycle[0] ?? ""].filter(Boolean);
}

function edgeKindsForCycle(cycle: string[], edges: DependencyEdge[]): DependencyEdgeKind[] {
  const kinds: DependencyEdgeKind[] = [];
  for (let index = 0; index < cycle.length - 1; index += 1) {
    const from = cycle[index];
    const to = cycle[index + 1];
    const edge = edges.find((candidate) => candidate.from === from && candidate.to === to);
    if (edge) {
      kinds.push(edge.kind);
    }
  }
  return kinds;
}

function literalString(node: unknown): string | undefined {
  return isAstNode(node) && node.type === "Literal" && typeof node.value === "string" ? node.value : undefined;
}
