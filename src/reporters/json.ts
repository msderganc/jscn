import type { AnalysisResult } from "../core/schema.js";
import { writeReport } from "./write.js";

export function renderJson(result: AnalysisResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function writeJson(path: string, result: AnalysisResult): void {
  writeReport(path, renderJson(result));
}
