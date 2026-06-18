export type AstNode = Record<string, any>;

export function traverseAst(node: unknown, visit: (node: AstNode, parent?: AstNode) => void, parent?: AstNode): void {
  if (!isAstNode(node)) {
    return;
  }

  visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === "parent" || key === "loc" || key === "range" || key === "tokens" || key === "comments") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        traverseAst(item, visit, node);
      }
    } else {
      traverseAst(value, visit, node);
    }
  }
}

export function isAstNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

export function nodeName(node: AstNode | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  if (node.type === "Identifier") {
    return node.name;
  }
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "MemberExpression") {
    const object = nodeName(node.object);
    const property = nodeName(node.property);
    return object && property ? `${object}.${property}` : object ?? property;
  }
  return undefined;
}
