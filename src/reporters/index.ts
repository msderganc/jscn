import type { OutputFormat } from "../config/schema.js";
import type { AnalysisResult } from "../core/schema.js";

import { renderCsv, writeCsv } from "./csv.js";
import { renderHtml, writeHtml } from "./html.js";
import { renderJson, writeJson } from "./json.js";
import { renderText } from "./text.js";
import { renderYaml, writeYaml } from "./yaml.js";

export function renderReport(result: AnalysisResult, format: OutputFormat): string {
  switch (format) {
    case "csv":
      return renderCsv(result);
    case "html":
      return renderHtml(result);
    case "json":
      return renderJson(result);
    case "text":
      return renderText(result);
    case "yaml":
      return renderYaml(result);
  }
}

export function writeReport(path: string, result: AnalysisResult, format: OutputFormat): void {
  switch (format) {
    case "csv":
      writeCsv(path, result);
      return;
    case "html":
      writeHtml(path, result);
      return;
    case "json":
      writeJson(path, result);
      return;
    case "yaml":
      writeYaml(path, result);
      return;
    case "text":
      throw new Error("Text output is not a machine-report format");
  }
}
