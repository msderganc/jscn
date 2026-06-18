import { join } from "node:path";

import type { OutputFormat, ResolvedConfig } from "../config/schema.js";

export function reportPath(command: "analyze", config: ResolvedConfig, generatedAt: string, format: OutputFormat = "json"): string {
  const stamp = generatedAt.replaceAll(":", "-").replaceAll(".", "-");
  return join(config.output.directory, `${command}_${stamp}.${extensionFor(format)}`);
}

function extensionFor(format: OutputFormat): string {
  return format === "text" ? "txt" : format === "yaml" ? "yaml" : format;
}
