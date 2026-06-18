import type { LineMap } from "./line-map.js";

export type SourceLanguage = "javascript" | "typescript";

export interface SourceFile {
  absolutePath: string;
  relativePath: string;
  text: string;
  language: SourceLanguage;
  sizeBytes: number;
  lineMap: LineMap;
}

export function languageForPath(path: string): SourceLanguage {
  return /\.(ts|tsx|mts|cts)$/i.test(path) ? "typescript" : "javascript";
}
