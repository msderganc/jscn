import type { AnalysisResult } from "../core/schema.js";
import { writeReport } from "./write.js";

export function renderYaml(result: AnalysisResult): string {
  return `${toYaml(result)}\n`;
}

export function writeYaml(path: string, result: AnalysisResult): void {
  writeReport(path, renderYaml(result));
}

function toYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    return value
      .map((item) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          return `${pad}- ${toYaml(item, indent + 2).trimStart()}`;
        }
        return `${pad}- ${scalar(item)}`;
      })
      .join("\n");
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) {
      return "{}";
    }
    return entries
      .map(([key, item]) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          const rendered = toYaml(item, indent + 2);
          return `${pad}${key}: ${rendered === "[]" || rendered === "{}" ? rendered : `\n${rendered}`}`;
        }
        return `${pad}${key}: ${scalar(item)}`;
      })
      .join("\n");
  }

  return scalar(value);
}

function scalar(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(String(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
