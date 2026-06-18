import { relative, resolve, sep } from "node:path";

import { ProjectDiscoveryError } from "./errors.js";

export function normalizeRoot(path: string): string {
  return resolve(path);
}

export function assertInsideRoot(path: string, root: string): string {
  const normalizedRoot = normalizeRoot(root);
  const normalizedPath = resolve(path);
  const relativePath = relative(normalizedRoot, normalizedPath);

  if (relativePath === "" || (!relativePath.startsWith("..") && !relativePath.includes(`..${sep}`))) {
    return normalizedPath;
  }

  throw new ProjectDiscoveryError(
    "PATH_OUTSIDE_ROOT",
    normalizedPath,
    `Path is outside the analysis root: ${normalizedPath}`
  );
}

export function toProjectRelativePath(path: string, root: string): string {
  return relative(normalizeRoot(root), resolve(path)).split(sep).join("/");
}
