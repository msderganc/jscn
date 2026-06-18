import { existsSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

interface AnalysisInputs {
  root: string;
  inputs: string[];
}

export function resolveAnalysisInputs(files: string[]): AnalysisInputs {
  if (files.length === 0 || files.some((file) => !isAbsolute(file))) {
    return { root: process.cwd(), inputs: files };
  }

  if (files.length === 1) {
    const absolute = resolve(files[0]!);
    if (existsSync(absolute) && statSync(absolute).isDirectory()) {
      return { root: absolute, inputs: ["."] };
    }
    return { root: dirname(absolute), inputs: [basename(absolute)] };
  }

  const absoluteFiles = files.map((file) => resolve(file));
  const root = commonAncestor(absoluteFiles);
  return {
    root,
    inputs: absoluteFiles.map((file) => relative(root, file).split(sep).join("/")),
  };
}

function commonAncestor(paths: string[]): string {
  const [first, ...rest] = paths.map((path) => path.split(sep).filter(Boolean));
  if (!first) {
    return process.cwd();
  }

  let length = first.length;
  for (const parts of rest) {
    length = Math.min(length, firstCommonLength(first, parts, length));
  }

  const prefix = first.slice(0, length).join(sep);
  return `${sep}${prefix}`;
}

function firstCommonLength(left: string[], right: string[], max: number): number {
  let index = 0;
  while (index < max && left[index] === right[index]) {
    index += 1;
  }
  return index;
}
