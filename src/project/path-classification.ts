export function isTestPath(relativePath: string): boolean {
  const path = normalizePath(relativePath);
  return (
    path.startsWith("tests/") ||
    path.includes("/__tests__/") ||
    path.includes("/__test__/") ||
    /\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/.test(path)
  );
}

export function isFixturePath(relativePath: string): boolean {
  const path = normalizePath(relativePath);
  return path.includes("/__fixtures__/") || path.includes("/fixtures/") || /\.fixture\./.test(path);
}

export function isGeneratedPath(relativePath: string): boolean {
  const path = normalizePath(relativePath);
  return (
    path.startsWith(".next/") ||
    path.startsWith("dist/") ||
    path.startsWith("build/") ||
    path.startsWith("coverage/") ||
    path.endsWith(".d.ts")
  );
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}
